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
