const request = require('request')
const _ = require('underscore')
const colors = require('colors')
const argv = require('yargs').argv

const url = 'http://cs241grader.web.engr.illinois.edu/malloc/data/results.json'
const nickname = 'Rent this spot: $5'

console.log("Fetching latest results...")

request({
  url: url,
  json: true,
}, (err, response, body) => handleResponse(err, response, body))

function handleResponse(err, response, results) {
  if (err || response.statusCode !== 200) {
    console.log('ERROR: failed to fetch results. Aborting...'.red)
    console.log(err.toString())
    return
  }

  // We'll maintain a map of ids to nicknames
  // We'll also hold on to the id of the person we're looking for
  const idNicknameMap = {}
  let nicknameId = null

  // First off, let's assign unique IDs to each student so we can track them without
  // their nickname, because nicknames aren't guaranteed to be unique
  _.each(results, (student, index) => {
    if (student.is_ta_solution) {
      student.nickname = 'glibc'
    } else {
      // We'll remove the newlines from their nicknames for good measure
      student.nickname = student.nickname.replace('\n', '')
    }

    student.id = index
    idNicknameMap[index] = student.nickname
    if (student.nickname == nickname) {
      if (nicknameId) {
        console.log(`WARNING: duplicate nickname '${student.nickname}'`.yellow)
      }
      nicknameId = index
    }
  })

  if (nicknameId === null) {
    console.log(`ERROR: student with nickname '${nickname}' not found. Aborting...`.red)
    return
  }

  // Now, let's find the TA solution (glibc) and store it
  const glibc = _.find(results, (student) => {
    return student.is_ta_solution === true
  })
  if (!glibc) {
    console.log('Error: glibc results not found. Aborting...'.red)
    return
  }

  // Apparently, we also have to hardcode the runtimes. rip.
  fixGlibc(glibc)

  // We'll insert a percentage into each student based on the formula from the site
  _.each(results, (student) => {
    student.rating = getRating(glibc, student)
  })

  // Let's also compute a percentage for each individual test case
  _.each(results, (student) => {
    _.each(student.test_cases, (test, index) => {
      test.rating = 100 * getTestRating(glibc.test_cases[index], test)
    })
  })

  // Optionally, remove all users who are failing any test
  // However, let's keep the user specified by nickname
  if (argv.omitfailing) {
    results = _.filter(results, (student) => {
      if (student.id == nicknameId) {
        return true
      }

      return _.every(student.test_cases, (test) => {
        return test.pts_earned == test.total_pts
      })
    })
  }

  // Let's split up results by test
  // First, map each student into an array of tests
  // This assumes the ordering of tests is the same between all students
  const students = _.map(results, (student) => {
    return _.map(student.test_cases, (testCase) => {
      // Add student's unique ID to each test
      let test = Object.assign({}, testCase)
      test.id = student.id
      return test
    })
  })

  // Now, transform the array of student results into an array of test results
  // Each array will contain results only for a certain test
  const allTests = _.unzip(students)

  //console.log(JSON.stringify(allTests, null, 4))

  // Now, let's sort the array of each test by the rating
  _.each(allTests, (test) => {
    test.sort((a, b) => b.rating - a.rating)
  })

  // Sort the results array by rating so we can figure out what our actual rating is
  results.sort((a, b) => b.rating - a.rating)

  // Let's figure out what the most recent grading run was
  const sortedResults = _.sortBy(results, (student) => new Date(student.time_stamp)).reverse()

  const overallRanking = _.findIndex(results, (s) => s.id == nicknameId)

  console.log(`\nMost recent grading run`.underline)
  console.log(`Nickname: ${idNicknameMap[sortedResults[0].id]}`)
  console.log(`Time: ${sortedResults[0].time_stamp}`)
  console.log(`Revision: ${sortedResults[0].last_revision}\n`)

  // Finally, let's print our ranking for each test
  console.log(`Results for ${nickname}`.bold.underline)
  console.log(`Overall rank: ${overallRanking + 1}!`.bold)
  console.log(`Overall score: ${results[overallRanking].rating.toFixed(2)}%`.bold)
  //console.log('\n')

  _.each(allTests, (test, index) => {
    const ranking = _.findIndex(test, (t) => t.id == nicknameId)
    const studentResult = test[ranking]
    const bestResult = test[0]
    if (studentResult.pts_earned != studentResult.total_pts) {
      console.log(`\nTEST ${index + 1}: FAILED`.red.bold.underline)
    } else {
      console.log(`\nTEST ${index + 1}: PASSED`.green.bold.underline)
      console.log(`Rank: `.grey.bold + `${ranking + 1}`)
      console.log(`Score: `.grey.bold + `${studentResult.rating.toFixed(2)}%`)
      console.log(`Top Score: `.grey.bold + `${bestResult.rating.toFixed(2)}% by '${idNicknameMap[bestResult.id]}'`)
    }
  })
}

// From http://cs241grader.web.engr.illinois.edu/malloc/
function fixGlibc(glibc) {
  // Hardcode the runtimes for the ta solution
  glibc.nickname = 'glibc'
  // Fudge memory usage for the first test so it doesn't show as 0 bytes
  glibc.test_cases[0].max_memory += 32.
  glibc.test_cases[0].avg_memory += 32.

  // TODO: runtimes are currently incorrect and need to be updated...
  // hardcode for now
  glibc.test_cases[0].runtime = 0.372000
  glibc.test_cases[1].runtime = 0.392000
  glibc.test_cases[2].runtime = 1.220000
  glibc.test_cases[3].runtime = 0.456000
  glibc.test_cases[4].runtime = 0.196000
  glibc.test_cases[5].runtime = 8.128000
  glibc.test_cases[6].runtime = 3.272000
  glibc.test_cases[7].runtime = 4.528000
  glibc.test_cases[8].runtime = 0.100000
  glibc.test_cases[9].runtime = 11.216000
  glibc.test_cases[10].runtime = 0.192000
  glibc.test_cases[11].runtime = 7.644000
}

// From http://cs241grader.web.engr.illinois.edu/malloc/
// Modified a bit to be more versatile
function getTestRating(ta, student) {
  student_test_case = student
  ta_test_case = ta
  if (student_test_case.pts_earned != student_test_case.total_pts) {
    // Like -Infinity, but not quite, so we can still kinda rank bad implementations
    return -1e15;
  }
  var runtime_fudge = 0.04; // 40ms
  var memory_fudge = 1024; // 1KB
  var ta_run = ta_test_case.runtime + runtime_fudge;
  var st_run = student_test_case.runtime > 0 ?
    (student_test_case.runtime + runtime_fudge) : Infinity;
  var ta_avg = ta_test_case.avg_memory + memory_fudge;
  var st_avg = student_test_case.avg_memory > 0 ?
    (student_test_case.avg_memory + memory_fudge) : Infinity;
  var ta_max = ta_test_case.max_memory + memory_fudge;
  var st_max = student_test_case.max_memory > 0 ?
    (student_test_case.max_memory + memory_fudge) : Infinity;
  return (
    (0.25) * Math.log2(ta_run / st_run + 1) +
    (3/8) * Math.log2(ta_avg / st_avg + 1) +
    (3/8) * Math.log2(ta_max / st_max + 1));
}

var getRating = function(ta, student) {
  if (ta == undefined) {
    console.log("ta was undefined.")
    return -Infinity;
  }
  if (student == undefined) {
    console.log("Student was undefined.")
    return -Infinity;
  }
  if (student.test_cases == undefined) {
    console.log(student)
    return -Infinity;
  }

  student_ta_test_cases = _.zip(ta.test_cases, student.test_cases)

  return 100 * student_ta_test_cases.map((pair) => getTestRating(pair[0], pair[1])).reduce((a, b) => a + b, 0) /
    student.test_cases.length;
}
