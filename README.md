# crowdmark-exam-matcher-userscript
Grab matching statistics for a Crowdmark exam

## Instructions
Go to https://app.crowdmark.com/exam-matcher/. Open up the developer tools, and paste the contents of `script.js` into the Javascript console.
You may need to follow some additional instructions before the browser will allow you to paste code.

After pasting, first run

```js
await installAuthToken("TOKEN_HERE")
```
with `TOKEN_HERE` replaced by one of the 7-letter alphanumeric codes from Crowdmark. If this succeeds, there'll be no output. If it fails, it's likely due to the token already having been claimed.

Once the above succeeds, run
```js
await getStatistics()
```
as many times as you need.

The above prints a lot of information. To just print a table mapping each matcher to the number of papers they've matched, run

```js
await printPerMatcherCount()
```

You can also obtain scan counts per room, but due to limitations in the information provided by Crowdmark's API, this first requires providing the script with all available tokens (the script will not claim any previously unclaimed tokens). If `tokens` is a list of tokens, then

```js
await printPerRoomCount(tokens)
```

will print a table mapping each room to the number of papers scanned in each room. To get accurate counts, it is important that the `tokens` list is a superset of all tokens used by the scanners since this script uses the list to map each scanner to the room they are in. 
