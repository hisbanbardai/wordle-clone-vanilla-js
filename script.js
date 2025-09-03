// =====================
// STATE / DATA
// =====================

const board = {
  wordOfTheDay: "",
  guesses: {
    guess1: [],
    guess2: [],
    guess3: [],
    guess4: [],
    guess5: [],
    guess6: [],
  },
  currentGuess: 1,
  currentInput: 0,
  isCurrentWordValid: false,
  getCurrentWord() {
    return this.guesses[`guess${this.currentGuess}`].join("");
  },
  getCurrentInputElement() {
    return document.querySelector(
      `.guess${this.currentGuess}-input${this.currentInput}`
    );
  },
};

// =====================
// DOM ELEMENTS
// =====================

const overlayEle = document.querySelector(".overlay");
const loaderEle = document.querySelector(".loader");
const modalEle = document.querySelector(".modal");
const btnEle = document.querySelector(".btn");

// =====================
// EVENT LISTENERS
// =====================

document.addEventListener("DOMContentLoaded", function () {
  showLoader();
  init();
  hideLoader();
});

document.addEventListener("keydown", handleKeydown);
btnEle.addEventListener("click", function () {
  hideModal();
});

// =====================
// BUSINESS LOGIC
// =====================

function isLetter(char) {
  return /^[a-zA-Z]$/.test(char);
}

function saveLetter(letter) {
  const { currentGuess } = board;
  board.guesses[`guess${currentGuess}`].push(letter);
}

function removeLetter() {
  const { currentGuess } = board;
  board.guesses[`guess${currentGuess}`].pop();
}

async function validateWord() {
  const word = board.getCurrentWord();
  const response = await fetch("https://words.dev-apis.com/validate-word", {
    method: "POST",
    body: JSON.stringify({
      word,
    }),
  });
  const { validWord } = await response.json();
  board.isCurrentWordValid = validWord;

  return validWord;
}

function markCorrectAndIncorrectLetters(
  slicedWordOfTheDay,
  slicedWord,
  wordOfTheDay,
  results
) {
  const remainingLetters = slicedWord.map((letter, wordIndex) => {
    const isIncluded = wordOfTheDay.includes(letter);

    if (isIncluded) {
      if (letter === wordOfTheDay[wordIndex]) {
        results.push("correct");

        slicedWordOfTheDay.splice(wordIndex, 1, " ");

        slicedWord.splice(wordIndex, 1, " ");
      } else {
        results.push("correct-misplaced");
        return letter;
      }
    } else {
      results.push("incorrect");

      slicedWord.splice(wordIndex, 1, " ");
    }
  });

  return remainingLetters;
}

function markCorrectMisplacedLetters(
  remainingLetters,
  slicedWordOfTheDay,
  results
) {
  remainingLetters.forEach((letter, index) => {
    if (!letter) return;

    const matchingIndexesArr = getIndexesOfLetterInWordOfTheDay(
      letter,
      slicedWordOfTheDay
    );

    if (!matchingIndexesArr.length) {
      results[index] = "incorrect";
    } else {
      results[index] = "correct-misplaced";
      slicedWordOfTheDay.splice(matchingIndexesArr[0], 1, " ");
    }
  });
}

function getIndexesOfLetterInWordOfTheDay(letter, slicedWordOfTheDay) {
  if (letter === " ") {
    return;
  }

  const indexArr = [];
  const wordOfTheDay = slicedWordOfTheDay;

  for (let i = 0; i < wordOfTheDay.length; i++) {
    if (wordOfTheDay[i] === letter) {
      indexArr.push(i);
    }
  }

  return indexArr;
}

function compareWords() {
  const { wordOfTheDay, getCurrentWord } = board;
  const word = getCurrentWord.apply(board);
  const results = [];

  let slicedWordOfTheDay = wordOfTheDay.split("");
  let slicedWord = word.split("");

  const remainingLetters = markCorrectAndIncorrectLetters(
    slicedWordOfTheDay,
    slicedWord,
    wordOfTheDay,
    results
  );

  markCorrectMisplacedLetters(remainingLetters, slicedWordOfTheDay, results);

  return results;
}

function switchToNextGuess() {
  if (board.currentGuess < 6) {
    board.currentGuess += 1;
    board.currentInput = 0;
    focusInput();
  } else {
    showModal(`Game over. The word was ${board.wordOfTheDay}`);
    endGame();
  }
}

// =====================
// DOM MANIPULATION
// =====================

function focusInput() {
  board.getCurrentInputElement().focus();
}

function updateDisplay(results) {
  results.forEach((className, index) => {
    const inputEle = document.querySelector(
      `.guess${board.currentGuess}-input${index}`
    );
    inputEle.classList.add(className);
  });
}

function insertDataInModal(message) {
  modalEle.insertAdjacentHTML("afterbegin", `<p>${message}</p>`);
}

function showLoader() {
  overlayEle.classList.remove("hidden");
  loaderEle.classList.remove("hidden");
}

function hideLoader() {
  overlayEle.classList.add("hidden");
  loaderEle.classList.add("hidden");
}

function showModal(message) {
  overlayEle.classList.remove("hidden");
  modalEle.classList.remove("hidden");
  insertDataInModal(message);
}

function hideModal() {
  overlayEle.classList.add("hidden");
  modalEle.classList.add("hidden");
}

// =====================
// GAME FLOW
// =====================

function handleBackspace() {
  //check if current input has value and delete it
  const currentInputEle = board.getCurrentInputElement();
  if (currentInputEle.value) {
    currentInputEle.value = "";
    removeLetter();
    return;
  }

  //if currentinput is greater than 0 then move focus to previous input
  if (board.currentInput > 0) {
    board.currentInput = board.currentInput - 1;
    focusInput();
    board.getCurrentInputElement().value = "";
    removeLetter();
  }
}

function handleOtherCharacters(key) {
  const currentInputEle = board.getCurrentInputElement();
  const char = key.toUpperCase();

  //check if it is a letter or if the last letter is already filled
  if (!isLetter(char) || (board.currentInput === 4 && currentInputEle.value)) {
    return;
  }

  //Set input value
  currentInputEle.value = char;

  //save character in the state
  saveLetter(char);

  if (board.currentInput < 4) {
    board.currentInput = board.currentInput + 1;
    focusInput();
  }
}

function endGame() {
  document.activeElement.blur();
  document.removeEventListener("keydown", handleKeydown);
}

async function handleEnter() {
  const { currentInput, wordOfTheDay } = board;
  if (currentInput !== 4 || !board.getCurrentInputElement().value) {
    return;
  }

  showLoader();

  if (!(await validateWord())) {
    hideLoader();
    return;
  } else {
    const results = compareWords();
    hideLoader();
    updateDisplay(results);

    if (board.getCurrentWord() === wordOfTheDay) {
      showModal("You won!!");
      endGame();
    } else {
      switchToNextGuess();
    }
  }
}

function handleKeydown(e) {
  e.preventDefault();
  if (e.key === "Backspace") {
    handleBackspace();
  } else if (e.key === "Enter") {
    handleEnter();
  } else {
    handleOtherCharacters(e.key);
  }
}

async function fetchWordOfTheDay() {
  try {
    const response = await fetch("https://words.dev-apis.com/word-of-the-day");
    const data = await response.json();
    return data.word;
  } catch (error) {
    console.error(error);
  }
}

async function init() {
  const word = await fetchWordOfTheDay();
  board.wordOfTheDay = word.toUpperCase();
  focusInput();
}
