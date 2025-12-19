// Blocked page script with challenge system

let blockedUrl = '';
let settings = {};
let blockStats = {};
let challengeInProgress = false; // Prevent double-clicking

// Motivational quotes
const quotes = [
  "The secret of getting ahead is getting started.",
  "Focus is a matter of deciding what things you're not going to do.",
  "You don't have to be great to start, but you have to start to be great.",
  "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
  "Discipline is choosing between what you want now and what you want most.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Your future is created by what you do today, not tomorrow.",
  "Don't watch the clock; do what it does. Keep going.",
  "The only way to do great work is to love what you do.",
  "Believe you can and you're halfway there."
];

// Typing challenge phrases
const typingPhrases = [
  "I am in control of my focus and time.",
  "I choose productivity over distraction.",
  "My goals are more important than momentary pleasure.",
  "I am stronger than my impulses.",
  "I will stay focused on what truly matters.",
  "Discipline equals freedom.",
  "I am building better habits one choice at a time."
];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Get blocked URL from query parameter
  const params = new URLSearchParams(window.location.search);
  blockedUrl = params.get('url');

  console.log('[FocusGuard] Blocked URL from params:', blockedUrl);

  if (blockedUrl) {
    try {
      const hostname = new URL(blockedUrl).hostname;
      document.querySelector('.blocked-url').textContent = hostname;
    } catch {
      document.querySelector('.blocked-url').textContent = 'This site';
    }
  } else {
    // Fallback: show generic message
    document.querySelector('.blocked-url').textContent = 'This site is blocked';
  }

  // Load settings
  const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
  settings = response;

  // Update block statistics
  updateBlockStats();

  // Show random motivational quote
  showRandomQuote();

  // Attach event listeners
  attachEventListeners();

  // Check if we should redirect instead
  if (settings.blockMode === 'redirect' && settings.redirectUrl) {
    // Give user 3 seconds to see the blocked message, then redirect
    setTimeout(() => {
      window.location.href = settings.redirectUrl;
    }, 3000);
  }
}

function attachEventListeners() {
  document.getElementById('goBackBtn').addEventListener('click', () => {
    window.history.back();
  });

  document.getElementById('tempUnblockBtn').addEventListener('click', showChallenge);
  document.getElementById('cancelChallengeBtn').addEventListener('click', hideChallenge);

  // Math challenge
  document.getElementById('submitMathBtn').addEventListener('click', checkMathAnswer);
  document.getElementById('mathAnswer').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkMathAnswer();
  });

  // Typing challenge
  document.getElementById('submitTypingBtn').addEventListener('click', checkTypingAnswer);
  document.getElementById('typingInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkTypingAnswer();
  });

  // Wait challenge
  document.getElementById('submitWaitBtn').addEventListener('click', completeWaitChallenge);

  // Mixed challenge
  document.getElementById('submitMixedMathBtn').addEventListener('click', checkMixedMathAnswer);
  document.getElementById('mixedMathAnswer').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkMixedMathAnswer();
  });
  document.getElementById('submitMixedWaitBtn').addEventListener('click', completeMixedChallenge);
}

async function updateBlockStats() {
  const today = new Date().toDateString();
  const data = await chrome.storage.local.get(['blockStats']);
  blockStats = data.blockStats || {};

  if (!blockStats[today]) {
    blockStats[today] = {};
  }

  const hostname = blockedUrl ? new URL(blockedUrl).hostname : 'unknown';
  blockStats[today][hostname] = (blockStats[today][hostname] || 0) + 1;

  await chrome.storage.local.set({ blockStats });

  // Calculate total blocks today
  const totalToday = Object.values(blockStats[today]).reduce((sum, count) => sum + count, 0);
  document.getElementById('blockCount').textContent = totalToday;
}

function showRandomQuote() {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById('motivationalQuote').textContent = quote;
}

function showChallenge() {
  // Prevent double-clicking
  if (challengeInProgress) {
    console.log('[FocusGuard] Challenge already in progress, ignoring click');
    return;
  }

  challengeInProgress = true;
  const challengeType = settings.challengeType || 'math';
  const container = document.getElementById('challengeContainer');

  // Clear any existing timer
  if (waitTimer) {
    clearInterval(waitTimer);
    waitTimer = null;
  }

  // Hide all challenges first
  document.querySelectorAll('.challenge').forEach(el => el.style.display = 'none');

  // Update instructions
  const instructions = {
    math: 'Solve this math problem to proceed:',
    typing: 'Type the following phrase exactly:',
    wait: 'Wait for the timer to complete:',
    mixed: 'First, solve this math problem:'
  };

  document.getElementById('challengeInstructions').textContent = instructions[challengeType];

  // Show appropriate challenge
  switch (challengeType) {
    case 'math':
      setupMathChallenge();
      document.getElementById('mathChallenge').style.display = 'block';
      break;
    case 'typing':
      setupTypingChallenge();
      document.getElementById('typingChallenge').style.display = 'block';
      break;
    case 'wait':
      setupWaitChallenge();
      document.getElementById('waitChallenge').style.display = 'block';
      break;
    case 'mixed':
      setupMixedChallenge();
      document.getElementById('mixedChallenge').style.display = 'block';
      break;
  }

  container.style.display = 'block';
}

function hideChallenge() {
  // Clear any running timer
  if (waitTimer) {
    clearInterval(waitTimer);
    waitTimer = null;
  }

  challengeInProgress = false;
  document.getElementById('challengeContainer').style.display = 'none';
}

// Math Challenge
let mathAnswer = 0;

function setupMathChallenge() {
  const num1 = Math.floor(Math.random() * 50) + 10;
  const num2 = Math.floor(Math.random() * 50) + 10;
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  let problem = '';
  switch (operation) {
    case '+':
      mathAnswer = num1 + num2;
      problem = `${num1} + ${num2} = ?`;
      break;
    case '-':
      mathAnswer = num1 - num2;
      problem = `${num1} - ${num2} = ?`;
      break;
    case '*':
      const smallNum1 = Math.floor(Math.random() * 12) + 2;
      const smallNum2 = Math.floor(Math.random() * 12) + 2;
      mathAnswer = smallNum1 * smallNum2;
      problem = `${smallNum1} × ${smallNum2} = ?`;
      break;
  }

  document.getElementById('mathProblem').textContent = problem;
  document.getElementById('mathAnswer').value = '';
  document.getElementById('mathError').textContent = '';
  document.getElementById('mathAnswer').focus();
}

function checkMathAnswer() {
  const userAnswer = parseInt(document.getElementById('mathAnswer').value);
  const errorEl = document.getElementById('mathError');

  if (userAnswer === mathAnswer) {
    grantTemporaryUnblock();
  } else {
    errorEl.textContent = 'Incorrect answer. Try again!';
    document.getElementById('mathAnswer').classList.add('shake');
    setTimeout(() => {
      document.getElementById('mathAnswer').classList.remove('shake');
      setupMathChallenge(); // Generate new problem
    }, 500);
  }
}

// Typing Challenge
let currentPhrase = '';

function setupTypingChallenge() {
  currentPhrase = typingPhrases[Math.floor(Math.random() * typingPhrases.length)];
  document.getElementById('quoteDisplay').textContent = currentPhrase;
  document.getElementById('typingInput').value = '';
  document.getElementById('typingError').textContent = '';
  document.getElementById('typingInput').focus();
}

function checkTypingAnswer() {
  const userInput = document.getElementById('typingInput').value;
  const errorEl = document.getElementById('typingError');

  if (userInput === currentPhrase) {
    grantTemporaryUnblock();
  } else {
    errorEl.textContent = 'Text doesn\'t match exactly. Check for typos and try again!';
    document.getElementById('typingInput').classList.add('shake');
    setTimeout(() => {
      document.getElementById('typingInput').classList.remove('shake');
    }, 500);
  }
}

// Wait Challenge
let waitTimer = null;

function setupWaitChallenge() {
  const duration = settings.waitDuration || 30;
  const submitBtn = document.getElementById('submitWaitBtn');
  submitBtn.disabled = true;

  startTimer('timerText', 'timerCircle', duration, () => {
    submitBtn.disabled = false;
    submitBtn.focus();
  });
}

function completeWaitChallenge() {
  if (waitTimer) clearInterval(waitTimer);
  grantTemporaryUnblock();
}

// Mixed Challenge (Math + Wait)
let mixedMathAnswer = 0;

function setupMixedChallenge() {
  document.getElementById('mixedMathPart').style.display = 'block';
  document.getElementById('mixedWaitPart').style.display = 'none';

  const num1 = Math.floor(Math.random() * 50) + 10;
  const num2 = Math.floor(Math.random() * 50) + 10;
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  let problem = '';
  switch (operation) {
    case '+':
      mixedMathAnswer = num1 + num2;
      problem = `${num1} + ${num2} = ?`;
      break;
    case '-':
      mixedMathAnswer = num1 - num2;
      problem = `${num1} - ${num2} = ?`;
      break;
    case '*':
      const smallNum1 = Math.floor(Math.random() * 12) + 2;
      const smallNum2 = Math.floor(Math.random() * 12) + 2;
      mixedMathAnswer = smallNum1 * smallNum2;
      problem = `${smallNum1} × ${smallNum2} = ?`;
      break;
  }

  document.getElementById('mixedMathProblem').textContent = problem;
  document.getElementById('mixedMathAnswer').value = '';
  document.getElementById('mixedMathError').textContent = '';
  document.getElementById('mixedMathAnswer').focus();
}

function checkMixedMathAnswer() {
  const userAnswer = parseInt(document.getElementById('mixedMathAnswer').value);
  const errorEl = document.getElementById('mixedMathError');

  if (userAnswer === mixedMathAnswer) {
    // Move to wait part
    document.getElementById('mixedMathPart').style.display = 'none';
    document.getElementById('mixedWaitPart').style.display = 'block';
    document.getElementById('challengeInstructions').textContent = 'Great! Now wait for the timer:';

    const duration = settings.waitDuration || 30;
    const submitBtn = document.getElementById('submitMixedWaitBtn');
    submitBtn.disabled = true;

    startTimer('mixedTimerText', 'mixedTimerCircle', duration, () => {
      submitBtn.disabled = false;
      submitBtn.focus();
    });
  } else {
    errorEl.textContent = 'Incorrect answer. Try again!';
    document.getElementById('mixedMathAnswer').classList.add('shake');
    setTimeout(() => {
      document.getElementById('mixedMathAnswer').classList.remove('shake');
      setupMixedChallenge();
    }, 500);
  }
}

function completeMixedChallenge() {
  if (waitTimer) clearInterval(waitTimer);
  grantTemporaryUnblock();
}

// Timer utility
function startTimer(textId, circleId, duration, onComplete) {
  let remaining = duration;
  const circle = document.getElementById(circleId);
  const circumference = 2 * Math.PI * 54; // radius is 54

  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = 0;

  document.getElementById(textId).textContent = remaining;

  waitTimer = setInterval(() => {
    remaining--;
    document.getElementById(textId).textContent = remaining;

    // Update circle progress
    const offset = circumference - (remaining / duration) * circumference;
    circle.style.strokeDashoffset = offset;

    if (remaining <= 0) {
      clearInterval(waitTimer);
      onComplete();
    }
  }, 1000);
}

// Grant temporary unblock
async function grantTemporaryUnblock() {
  const duration = 15; // 15 minutes

  // Make sure we have a valid URL
  if (!blockedUrl) {
    console.error('[FocusGuard] No blocked URL available');
    alert('Error: Cannot determine blocked URL. Please close this tab and try again.');
    return;
  }

  console.log('[FocusGuard] Granting temporary unblock for:', blockedUrl);

  const response = await chrome.runtime.sendMessage({
    action: 'addTemporaryUnblock',
    url: blockedUrl,
    duration: duration
  });

  console.log('[FocusGuard] Temporary unblock response:', response);

  if (response.success) {
    // Wait a moment for the rules to update
    setTimeout(() => {
      // Redirect to the original URL
      console.log('[FocusGuard] Redirecting to:', blockedUrl);
      window.location.href = blockedUrl;
    }, 500);
  } else {
    alert('Failed to unblock site. Please try again.');
  }
}
