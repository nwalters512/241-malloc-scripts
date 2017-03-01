# 241-malloc-scripts

Pulls and analyzes data from the [UIUC CS 241 malloc contest](http://cs241grader.web.engr.illinois.edu/malloc/).

Course staff were kind enough to expose the contest results in an easily-digestible JSON file: [http://cs241grader.web.engr.illinois.edu/malloc/data/results.json](http://cs241grader.web.engr.illinois.edu/malloc/data/results.json). This script downloads this file and then reports on hwo you're performing.

## Usage

Open `malloc.js` and specify your nickname in the `nickname` variable at the top of the file. Then, run `npm start` from the root of this repo. The output will be printed to your console and nicely formatted.

Currently, this script reports the following:

* Your overall ranking
* Your ranking for each individual test case
* Your score for each test case as a percentage of glibc's performance (lower is better)
* The top score and that score's nickname for each test case

This script uses the formulas from the source code of the contest page. Those formulas are apparently changing frequently, and they currently do some hacky things like hardcoding the results of glibc and adding in various "fudge factors". The formulas in this script are not guaranteed to match the current formulas. Use at your own risk!
