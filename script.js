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

async function getStatistics() {
    if (window[AUTH_TOKEN] === undefined) {
        throw new Error("no auth token installed; run installAuthToken(<token>) first");
    }
    const enrollments = await allEnrollments(window[AUTH_TOKEN]);
    return computeMatchingStatistics(enrollments);
}

async function printPerMatcherCount() {
    const stats = await getStatistics();
    const matcherToMatched = Object.fromEntries(Object.entries(stats.byMatcher).map(([matcher, matcherStats]) => {
        return [matcher, matcherStats.totalMatched];
    }));
    console.table(matcherToMatched);
}
