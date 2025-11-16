// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
// https://firebase.google.com/docs/web/setup#available-libraries

// 🎯 사용자 지정 변수
const APP_VERSION = "v0.04";
const JSON_FILE_NAME = "sobang-v0.03.json"; 
const IMAGE_BASE_PATH = "/image/"; 

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCIGhIB4Ju-EriiODG6kryPG0L54OGKTRI",
    authDomain: "sobanglevel2.firebaseapp.com",
    projectId: "sobanglevel2",
    storageBucket: "sobanglevel2.firebasestorage.app",
    messagingSenderId: "1000021218348",
    appId: "1:1000021218348:web:87881240640481caea6d89",
    measurementId: "G-80TRB9F2KT",
    databaseURL: "https://sobanglevel2-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);

let quizData = []; // 모든 문제 데이터
let currentBookProblems = []; // 현재 선택된 book의 문제 데이터
let bookList = []; // 전체 Book 목록
let currentUser = null; // 현재 로그인한 사용자 정보
let currentProblemIndex = 0; // 현재 풀고 있는 문제의 인덱스
let isAnswered = false; // 현재 문제가 풀이되었는지 여부



// DOM 요소
const bookSelect = document.getElementById('book-select');
const loadStatus = document.getElementById('load-status');
const imageA = document.getElementById('image_a');
const imageB = document.getElementById('image_b');
const resultContainer = document.getElementById('result-container');
const resultMessage = document.getElementById('result-message');
const optionsContainer = document.getElementById('options-container');
const nextButton = document.getElementById('next-button');
const quizHeader = document.getElementById('quiz-header');
const currentProblemInfo = document.getElementById('current-problem-info');
const bookSelectorContainer = document.getElementById('book-selector-container');
const totalProblemsInfo = document.getElementById('total-problems-info');
const imageContainer = document.getElementById('image-container');
const localStorageStatus = document.getElementById('local-storage-status');
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const closeModalButton = document.getElementById('close-modal-button');
const progressSummaryContainer = document.getElementById('progress-summary-container');
const resetAllButton = document.getElementById('reset-all-button');
const resetCurrentBookButton = document.getElementById('reset-current-book-button');
const prevBookButton = document.getElementById('prev-book-button');
const nextBookButton = document.getElementById('next-book-button');
const loginIcon = document.getElementById('login-icon');
const userStatus = document.getElementById('user-status');
const logoutButton = document.getElementById('logout-button');

// =========================================================================
// 🚀 초기화 및 이벤트 리스너
// =========================================================================

// 앱 제목에 버전 표시
const appTitle = document.querySelector('.app-header h1');
if (appTitle) {
    appTitle.textContent += `(${APP_VERSION})`;
}

// document.addEventListener('DOMContentLoaded', () => loadData(null)); // onAuthStateChanged가 모든 로딩을 처리하므로 이 줄은 제거합니다.
loginIcon.addEventListener('click', () => window.location.href = 'login.html');
settingsButton.addEventListener('click', () => settingsModal.style.display = 'block');
closeModalButton.addEventListener('click', () => settingsModal.style.display = 'none');
resetAllButton.addEventListener('click', resetAllLearning);
resetCurrentBookButton.addEventListener('click', resetCurrentBookLearning);
prevBookButton.addEventListener('click', prevBook);
nextBookButton.addEventListener('click', nextBook);
nextButton.addEventListener('click', nextProblem);
bookSelect.addEventListener('change', () => selectBook(bookSelect.value));
logoutButton.addEventListener('click', handleLogout);

// =========================================================================
// 👤 Firebase 인증 관련 함수
// =========================================================================

/**
 * 로그아웃 처리
 */
async function handleLogout() {
    try {
        await signOut(auth);
        alert('로그아웃 되었습니다.');
    } catch (error) {
        console.error("로그아웃 오류:", error);
        alert(`로그아웃 실패: ${error.message}`);
    }
}

/**
 * 사용자 인증 상태 변경 감지
 * 페이지 로드 시 사용자의 로그인 상태를 확인하고 UI를 업데이트합니다.
 */
onAuthStateChanged(auth, user => {
    if (user) {
        // 사용자가 로그인한 경우 (user 객체가 존재)
        currentUser = user;
        userStatus.style.display = 'inline-flex';
        loginIcon.style.display = 'none';
        loadData(currentUser.uid); // 사용자 ID로 데이터 로드
    } else {
        // 사용자가 로그아웃한 경우 (user 객체가 null)
        // 로그인 페이지로 리디렉션
        window.location.href = 'login.html';
    }
});
// =========================================================================
// 💾 Firebase 데이터베이스 관련 함수
// =========================================================================

/**
 * Firebase에서 학습 데이터를 불러옵니다.
 * @param {string} userId - Firebase 사용자 UID
 * @returns {Promise<Object|null>} 저장된 데이터 또는 null
 */
async function loadFromFirebase(userId) {
    if (!userId) return null;
    const dbRef = ref(db, `users/${userId}`);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
        localStorageStatus.textContent = `✅ Firebase에서 학습 이력을 불러왔습니다.`;
        return snapshot.val();
    }
    localStorageStatus.textContent = `⭐ 새로운 학습을 시작합니다.`;
    return null;
}

/**
 * Firebase에 문제 풀이 결과를 저장합니다.
 * @param {string} userId - Firebase 사용자 UID
 */
function saveProgressToFirebase(userId) {
    if (!userId) return;
    const progressData = quizData.map(p => ({
        book: p.book,
        num: p.num,
        testResult: p.testResult,
        solvedAt: p.solvedAt || null // solvedAt 정보 추가
    })).filter(p => p.testResult !== null); // 푼 문제만 저장

    set(ref(db, `users/${userId}/progress`), progressData)
        .then(() => localStorageStatus.textContent = `💾 학습 결과가 Firebase에 저장되었습니다.`)
        .catch(e => console.error("Firebase 저장 실패:", e));
}

/**
 * Firebase에 마지막 학습 위치를 저장합니다.
 * @param {string} userId - Firebase 사용자 UID
 */
function saveLastStateToFirebase(userId) {
    if (!userId || currentBookProblems.length === 0 || currentProblemIndex < 0) return;
    const lastState = {
        lastBook: currentBookProblems[currentProblemIndex].book,
        lastIndex: currentProblemIndex
    };
    set(ref(db, `users/${userId}/lastState`), lastState);
}

// =========================================================================
// 🔄 데이터 로드 및 문제 풀이 관련 함수
// =========================================================================

/**
 * 1. JSON 파일을 불러오고 사용자 데이터와 병합하는 함수
 * @param {string|null} userId - 로그인한 사용자의 UID, 비로그인 시 null
 */
async function loadData(userId) {
    const jsonFileName = JSON_FILE_NAME; 
    loadStatus.textContent = `데이터 (${jsonFileName})를 불러오는 중...`;
    
    try {
        const response = await fetch(jsonFileName); 
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const remoteData = await response.json();
        let userData = null;
        let lastState = null;

        if (userId) {
            userData = await loadFromFirebase(userId);
            if (userData) {
                lastState = userData.lastState;
            }
        } else {
            // 비로그인 시 로컬 저장소 사용 (선택적) 또는 초기화
            quizData = [];
            bookSelect.innerHTML = '<option>로그인 후 이용해주세요.</option>';
            document.getElementById('quiz-section').style.display = 'none';
            document.getElementById('progress-summary-section').style.display = 'none';
            loadStatus.textContent = '로그인하여 학습을 시작하세요.';
            return;
        }

        document.getElementById('quiz-section').style.display = 'block';
        document.getElementById('progress-summary-section').style.display = 'block';
        
        // JSON 데이터를 기본 템플릿으로 설정
        let mergedData = remoteData.map(problem => ({
            ...problem,
            testResult: null, // 기본값 초기화
            solvedAt: null    // 시간 정보 필드 추가
        }));

        // Firebase 데이터와 병합
        if (userData && userData.progress) {
            // testResult와 solvedAt을 함께 가져오도록 수정
            const userProgressMap = new Map(userData.progress.map(p => [`${p.book}-${p.num}`, { result: p.testResult, time: p.solvedAt }]));
            mergedData.forEach(problem => {
                const key = `${problem.book}-${problem.num}`;
                if (userProgressMap.has(key)) {
                    const progress = userProgressMap.get(key);
                    problem.testResult = progress.result;
                    problem.solvedAt = progress.time;
                }
            });
        }
        
        quizData = mergedData;
        
        loadStatus.textContent = `DB파일 "${jsonFileName}"에서 총 ${quizData.length}개의 문제를 성공적으로 업로드 하였습니다.`;
        
        setupBookSelector(quizData, lastState);
        updateProgressSummary(); // 학습 현황 업데이트
        updateSolvedProblemsChart(); // 차트 업데이트

    } catch (error) {
        loadStatus.textContent = `❌ 데이터 로드 실패: ${error.message}. 파일 경로를 확인해주세요.`;
        console.error("데이터 로드 오류:", error);
    }
}

/**
 * 2. Book 선택 드롭다운 설정 및 첫 번째 Book 자동 선택 함수
 * @param {Array} data - 전체 퀴즈 데이터
 * @param {Object|null} lastState - 마지막 학습 위치 정보
 */
function setupBookSelector(data, lastState = null) {
    bookList = [...new Set(data.map(item => item.book))].sort();
    
    bookSelect.innerHTML = ''; // 기존 옵션 클리어
    if (bookList.length === 0) {
        bookSelectorContainer.style.display = 'none';
        quizSection.style.display = 'none';
        return;
    }

    bookList.forEach(bookName => {
        const problemCount = data.filter(p => p.book === bookName).length;
        const option = document.createElement('option');
        option.value = bookName;
        option.textContent = `${bookName}(${problemCount}개)`;
        bookSelect.appendChild(option);
    });

    // 마지막 학습 위치 또는 첫 번째 Book 자동 선택
    let bookToSelect = bookList[0];
    let indexToSelect = null;

    if (lastState && bookList.includes(lastState.lastBook)) {
        bookToSelect = lastState.lastBook;
        indexToSelect = lastState.lastIndex;
    }

    bookSelect.value = bookToSelect;
    selectBook(bookToSelect, indexToSelect);
}

/**
 * 3. Book 선택 시 문제 목록을 필터링하고 첫 문제로 이동
 * @param {string} book - 선택된 Book의 이름
 * @param {number|null} startIndex - 시작할 문제의 인덱스 (지정하지 않으면 마지막으로 푼 문제 다음부터 시작)
 */
function selectBook(book, startIndex = null) {
    if (!book) {
        totalProblemsInfo.textContent = '';
        return;
    }
    
    currentBookProblems = quizData.filter(problem => problem.book === book);

    // 시작 인덱스 결정: 지정된 인덱스가 있으면 사용, 없으면 풀지 않은 첫 문제부터 시작
    const firstUnsolvedIndex = currentBookProblems.findIndex(p => p.testResult === null);
    currentProblemIndex = (startIndex !== null) ? startIndex : (firstUnsolvedIndex === -1 ? 0 : firstUnsolvedIndex);
    
    totalProblemsInfo.textContent = `선택된 Book: **${book}**, 총 ${currentBookProblems.length} 문제`;
    
    quizHeader.textContent = book;
    
    displayProblem(currentProblemIndex);
}

/**
 * 4. 현재 인덱스의 문제 출제
 */
function displayProblem(index) {
    if (index < 0 || index >= currentBookProblems.length) return;

    currentProblemIndex = index;
    isAnswered = false; 
    
    const problem = currentBookProblems[currentProblemIndex];
    
    // 현재 Book의 정답률 계산
    const completedProblems = currentBookProblems.filter(p => p.testResult !== null).length;
    const correctProblems = currentBookProblems.filter(p => p.testResult === 'ok').length;
    const correctRate = completedProblems > 0 ? Math.round((correctProblems / completedProblems) * 100) : 0;

    // 문제 정보 표시 (정답률 포함)
    currentProblemInfo.innerHTML = `문제 ${currentProblemIndex + 1} / ${currentBookProblems.length} (정답률 ${correctRate}%)`;
    
    // image_a 로드
    imageA.src = IMAGE_BASE_PATH + problem.image_a;
    imageA.alt = `${problem.book} 문제 ${problem.num}`;
    
    // 결과 및 해설 초기화
    resultContainer.style.display = 'none';
    imageB.style.display = 'none'; // 해설 이미지 숨기기
    nextButton.style.display = 'none';
    
    // 버튼 활성화 및 스타일 초기화
    document.querySelectorAll('.option-button').forEach(button => {
        button.disabled = false;
        button.style.backgroundColor = '#6c757d'; // 기본 회색으로 초기화
    });

    // 이미 풀었던 문제인 경우, 바로 결과 표시
    if (problem.testResult) {
        showPreviousResult(problem);
    }

    // 현재 위치를 Firebase에 저장
    if (currentUser) saveLastStateToFirebase(currentUser.uid);
}

/**
 * 4-1. 이미 풀었던 문제의 결과를 표시
 */
function showPreviousResult(problem) {
    isAnswered = true;
    const correctAnswer = problem.answer;
    
    document.querySelectorAll('.option-button').forEach(button => {
        button.disabled = true;
    });

    const correctButton = document.querySelector(`.option-button[data-option="${correctAnswer}"]`);
    if (correctButton) {
        correctButton.style.backgroundColor = '#007bff'; // 정답은 파란색으로 표시
    }

    if (problem.testResult === 'ok') {
        resultMessage.className = 'correct';
        resultMessage.textContent = `✅ 이전에 정답(${correctAnswer}번) 처리된 문제입니다.`;
    } else {
        resultMessage.className = 'incorrect';
        resultMessage.textContent = `❌ 이전에 오답 처리된 문제입니다. 정답은 ${correctAnswer}번입니다.`;
    }

    imageB.src = IMAGE_BASE_PATH + problem.image_b;
    imageB.alt = `${problem.book} 해설 ${problem.num}`;
    imageB.style.display = 'block';

    resultContainer.style.display = 'block';
    nextButton.style.display = 'block';
}


/**
 * 5. 선택 버튼 클릭 이벤트 핸들러
 */
optionsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('option-button') && !isAnswered) {
        checkAnswer(event.target);
    }
});

/**
 * 6. 정답 확인 로직 및 로컬 저장
 */
function checkAnswer(selectedButton) {
    isAnswered = true;
    const problem = currentBookProblems[currentProblemIndex];
    const userAnswer = selectedButton.dataset.option;
    const correctAnswer = problem.answer;
    
    let message = '';
    
    document.querySelectorAll('.option-button').forEach(button => {
        button.disabled = true;
    });

    // 정답/오답 확인
    if (userAnswer === correctAnswer) {
        message = `${userAnswer}번, 정답입니다. 🎉`;
        resultMessage.className = 'correct';
        problem.testResult = 'ok';
    } else {
        message = `틀렸습니다. 정답은 ${correctAnswer}번입니다. 😥`;
        resultMessage.className = 'incorrect';
        problem.testResult = 'nok';
    }

    // 정답/오답 여부와 관계없이 풀이 시간 기록
    problem.solvedAt = Date.now();
    
    // 해설 이미지 표시
    imageB.src = IMAGE_BASE_PATH + problem.image_b;
    imageB.alt = `${problem.book} 해설 ${problem.num}`;
    imageB.style.display = 'block';

    // 버튼 색상 변경
    if (userAnswer !== correctAnswer) {
        // 오답 선택 버튼 강조
        selectedButton.style.backgroundColor = 'red';
    }
    const correctButton = document.querySelector(`.option-button[data-option="${correctAnswer}"]`);
    if (correctButton) {
        correctButton.style.backgroundColor = '#007bff'; // 정답은 파란색으로 변경
    }
    
    resultMessage.textContent = message;
    resultContainer.style.display = 'block';
    nextButton.style.display = 'block';

    // 학습 결과를 Firebase에 저장
    if (currentUser) saveProgressToFirebase(currentUser.uid);
    
    // 결과 반영 후 현재 문제 정보 및 정답률 업데이트
    const completedProblems = currentBookProblems.filter(p => p.testResult !== null).length;
    const correctProblems = currentBookProblems.filter(p => p.testResult === 'ok').length;
    const correctRate = completedProblems > 0 ? Math.round((correctProblems / completedProblems) * 100) : 0;

    currentProblemInfo.innerHTML = `문제 ${currentProblemIndex + 1} / ${currentBookProblems.length} (정답률 ${correctRate}%)`;

    // 전체 학습 현황 업데이트
    updateProgressSummary();
    updateSolvedProblemsChart(); // 차트 업데이트

    // 현재 Book의 모든 문제를 풀었는지 확인
    const allSolved = currentBookProblems.every(p => p.testResult !== null);
    if (allSolved) {
        const currentBookName = quizHeader.textContent;
        setTimeout(() => alert(`'${currentBookName}'의 모든 문제를 풀이완료 했습니다.`), 100);
    }
}

/**
 * 7. 다음 문제로 이동
 */
function nextProblem() {
    if (currentProblemIndex < currentBookProblems.length - 1) {
        displayProblem(currentProblemIndex + 1);
    } else {
        alert("마지막 문제입니다. 첫 문제로 돌아갑니다.");
        displayProblem(0);
    }
}

/**
 * 8. 이전 문제로 이동
 */
function prevProblem() {
    if (currentProblemIndex > 0) {
        displayProblem(currentProblemIndex - 1);
    } else {
        alert("첫 문제입니다.");
    }
}

/**
 * 8-1. 다음 Book으로 이동
 */
function nextBook() {
    const currentBookName = bookSelect.value;
    const currentIndex = bookList.indexOf(currentBookName);
    const nextIndex = (currentIndex + 1) % bookList.length; // Wraps around
    const nextBookName = bookList[nextIndex];
    
    bookSelect.value = nextBookName;
    selectBook(nextBookName);
}

/**
 * 8-2. 이전 Book으로 이동
 */
function prevBook() {
    const currentBookName = bookSelect.value;
    const currentIndex = bookList.indexOf(currentBookName);
    const prevIndex = (currentIndex - 1 + bookList.length) % bookList.length; // Wraps around
    const prevBookName = bookList[prevIndex];

    bookSelect.value = prevBookName;
    selectBook(prevBookName);
}

/**
 * 9. 전체 학습 기록 초기화
 */
function resetAllLearning() {
    if (!currentUser) {
        alert("로그인 후 이용해주세요.");
        return;
    }
    if (confirm("정말로 모든 학습 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
        // Firebase에서 사용자 데이터 삭제
        set(ref(db, `users/${currentUser.uid}`), null).then(() => {
            alert("모든 학습 기록이 초기화되었습니다.");
            settingsModal.style.display = 'none';
            loadData(currentUser.uid); // 데이터 다시 로드
        });
    }
}

/**
 * 9-1. 현재 Book의 학습 기록 초기화
 */
function resetCurrentBookLearning() {
    if (!currentUser) {
        alert("로그인 후 이용해주세요.");
        return;
    }

    const currentBookName = bookSelect.value;
    if (!currentBookName) return;

    if (confirm(`'${currentBookName}' Book의 학습 기록만 초기화하시겠습니까?`)) {
        quizData.forEach(problem => {
            if (problem.book === currentBookName) {
                problem.testResult = null;
            }
        });

        saveProgressToFirebase(currentUser.uid); // 변경된 데이터 Firebase에 저장
        settingsModal.style.display = 'none'; // 모달 닫기
        updateProgressSummary(); // 하단 학습 현황 UI 업데이트
        selectBook(currentBookName, 0); // 현재 Book의 문제 목록 및 UI 새로고침 (0번 문제부터)
    }
}

/**
 * 10. 전체 Book별 학습 현황을 계산하고 표시 (updateProgressSummary)
 */
function updateProgressSummary() {
    if (!quizData || quizData.length === 0) return;

    // 전체 진도율 계산 및 제목 업데이트
    const summaryTitle = document.querySelector('#progress-summary-section h2');
    if (summaryTitle) {
        const totalProblemCount = quizData.length;
        const completedProblemCount = quizData.filter(p => p.testResult !== null).length;
        const overallProgress = totalProblemCount > 0 ? Math.round((completedProblemCount / totalProblemCount) * 100) : 0;
        summaryTitle.textContent = `전체 학습 현황 (총 ${totalProblemCount}개, ${overallProgress}%)`;
    }


    progressSummaryContainer.innerHTML = ''; // 기존 내용 초기화

    const books = [...new Set(quizData.map(item => item.book))].sort();

    books.forEach(bookName => {
        const bookProblems = quizData.filter(p => p.book === bookName);
        const totalProblems = bookProblems.length;
        const completedProblems = bookProblems.filter(p => p.testResult !== null).length;
        const correctProblems = bookProblems.filter(p => p.testResult === 'ok').length;
        
        // 정답률 계산 (푼 문제가 있을 경우에만)
        const correctRate = completedProblems > 0 ? Math.round((correctProblems / completedProblems) * 100) : 0;

        const progressParagraph = document.createElement('p');
        progressParagraph.className = 'progress-text';
        progressParagraph.textContent = `${bookName} : 문제수 ${totalProblems}, 풀이완료 ${completedProblems}, 정답률 ${correctRate}%`;

        progressSummaryContainer.appendChild(progressParagraph);
    });
}

/**
 * 11. 최근 7일간 푼 문제 수를 차트로 표시
 */
let myChart = null; // 차트 인스턴스를 저장할 변수
function updateSolvedProblemsChart() {
    if (!quizData || quizData.length === 0) return;

    const solvedProblems = quizData.filter(p => p.solvedAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 날짜의 시작

    const labels = [];
    const data = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        const count = solvedProblems.filter(p => {
            const solvedDate = new Date(p.solvedAt);
            return solvedDate >= date && solvedDate < nextDate;
        }).length;

        labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
        data.push(count);
    }

    const ctx = document.getElementById('solved-problems-chart').getContext('2d');

    if (myChart) {
        myChart.destroy(); // 기존 차트가 있으면 파괴
    }

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '일별 풀이 문제 수',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 } // y축 단위를 1로 설정
                }
            }
        }
    });
}


// =========================================================================
// 🖱️ 스와이프 기능 구현 (Touch 및 Mouse)
// =========================================================================
let startX = 0;
let endX = 0;
const SWIPE_THRESHOLD = 50; 

// 모바일 터치 이벤트
imageContainer.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
});

imageContainer.addEventListener('touchend', (e) => {
    endX = e.changedTouches[0].clientX;
    handleSwipe();
});

// PC 마우스 드래그 이벤트
let isDragging = false;

imageContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    imageContainer.style.cursor = 'grabbing';
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        imageContainer.style.cursor = 'grab';
        handleSwipe();
    }
});

imageContainer.addEventListener('mousemove', (e) => {
    if (isDragging) {
        endX = e.clientX;
    }
});

function handleSwipe() {
    if (startX === 0 && endX === 0) return; // 스와이프가 아닌 단순 클릭 방지

    const deltaX = endX - startX;
    
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX > 0) {
            // 오른쪽 스와이프 (이전 문제)
            prevProblem();
        } else {
            // 왼쪽 스와이프 (다음 문제) - 문제를 푼 경우에만 이동
            if (isAnswered) {
                nextProblem();
            } else {
                // 문제를 풀지 않았으면 아무 동작도 하지 않음
            }
        }
    }
    startX = 0;
    endX = 0;
}