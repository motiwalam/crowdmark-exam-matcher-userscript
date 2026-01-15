const AUTH_TOKEN = Symbol("auth_token");

async function searchEnrollments(authToken, term) {
	return await fetch("https://app.crowdmark.com/api/v1/mobile_tokens/enrollments?term=" + term, {
      "credentials": "include",
      "headers": {
          "X-Mobile-Auth-Token": authToken,
      },
      "method": "GET",
      "mode": "cors"
	}).then(r => r.json());
}

async function allEnrollments(authToken) {
    const enrollmentData = await searchEnrollments(authToken, "");
    return enrollmentData?.enrollments ?? [];
}

async function tokenInfo(token) {
    return await fetch("https://app.crowdmark.com/api/v2/mobile-tokens/" + token, {
        "credentials": "include",
        "method": "GET",
        "mode": "cors"
    }).then(r => r.json());
}

async function matcherToRoom(tokens) {
    const tokensInfo = await Promise.all(tokens.map(tokenInfo));
    const claimedTokens = tokensInfo.filter(o => 'data' in o && o.data?.attributes?.["claimed-at"] != null);
    return Object.fromEntries(claimedTokens.map(ti => {
        return [ti?.data?.attributes?.name, ti?.data?.attributes?.["room-number"]?.trim?.()?.toLowerCase?.()]
    }));
}

async function claimToken(token, name, room) {
    return await fetch(`https://app.crowdmark.com/api/v1/mobile_tokens/${encodeURI(token)}/claim?name=${encodeURI(name)}&room_number=${encodeURI(room)}`, {
        "credentials": "include",
        "method": "GET",
        "mode": "cors"
    }).then(r => r.json());
}

async function getAuthToken(token) {
    const claimResult = await claimToken(token, "scraper-script", "WWW");
    if (claimResult.error) {
        throw new Error(claimResult.error);
    }
    return claimResult.auth_token;
}

function groupByMatcher(enrollments) {
    const grouped = {};
    for (const e of enrollments) {
        if (e?.matcher_name === undefined) {
            continue;
        }
        if (grouped[e.matcher_name] === undefined) {
            grouped[e.matcher_name] = [];
        }
        grouped[e.matcher_name].push(e);
    }

    const out = Object.fromEntries(Object.entries(grouped).map(([matcher, es]) => {
        return [matcher, {
            totalMatched: es.length,
            studentNames: es.map(o => o.name),
            studentNums: es.map(o => o.identifier),
            allData: es
        }];
    }));
    
    return out;
}

function computeMatchingStatistics(enrollments) {
    const unMatched = enrollments.filter(o => o?.matcher_name === undefined);

    return {
        totalMatched: enrollments.filter(o => o?.matcher_name !== undefined).length,
        totalUnmatched: unMatched.length,
        byMatcher: groupByMatcher(enrollments),
        unMatched: {
            names: unMatched.map(o => o.name),
            studentNums: unMatched.map(o => o.identifier),
            allData: unMatched,
        },
        allEnrollments: enrollments,
    }
}

async function installAuthToken(token) {
    window[AUTH_TOKEN] = await getAuthToken(token);
}

async function getStatistics(tokens) {
    if (window[AUTH_TOKEN] === undefined) {
        throw new Error("no auth token installed; run installAuthToken(<token>) first");
    }
    const enrollments = await allEnrollments(window[AUTH_TOKEN]);
    const stats = computeMatchingStatistics(enrollments);
    stats.byRoom = {};
    if (tokens !== undefined) {
        const mtr = await matcherToRoom(tokens);
        const byRoom = {};

        for (const [matcher, matcherStats] of Object.entries(stats.byMatcher)) {
            const room = mtr[matcher];
            if (room === undefined) continue;

            if (byRoom[room] === undefined) {
                byRoom[room] = matcherStats;
            } else {
                const a = byRoom[room];
                const b = matcherStats;

                byRoom[room] = {
                    totalMatched: a.totalMatched + b.totalMatched,
                    studentNames: a.studentNames.concat(b.studentNames),
                    studentNums: a.studentNums.concat(b.studentNums),
                    allData: a.allData.concat(b.allData),
                };
            }
        }
        stats.byRoom = byRoom;
    }
    return stats
}

async function printPerMatcherCount() {
    const stats = await getStatistics();
    const matcherToMatched = Object.fromEntries(Object.entries(stats.byMatcher).map(([matcher, matcherStats]) => {
        return [matcher, matcherStats.totalMatched];
    }));
    console.table(matcherToMatched);
}

async function printPerRoomCount(tokens) {
    const stats = await getStatistics(tokens);
    const roomToMatched = Object.fromEntries(Object.entries(stats.byRoom).map(([room, roomStats]) => {
        return [room, roomStats.totalMatched];
    }));
    console.table(roomToMatched);
}

function parseTokensFromTable(table) {
    const rows = table.split('\n').filter(r => !r.includes('Created'));
    const tokens = rows.map(r => r.split('\t').at(0).trim());
    return tokens;
}