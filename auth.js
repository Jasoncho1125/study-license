import { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { APP_NAME } from './config.js';
import { auth, db } from './firebase-config.js';

// 앱 제목 설정
const authAppTitle = document.querySelector('.auth-box h1');
if (authAppTitle) {
    authAppTitle.textContent = APP_NAME;
}

// 공통 에러 메시지 DOM
const errorMessage = document.getElementById('error-message');

// =========================================================================
// 👤 회원가입 관련 로직 (signup.html)
// =========================================================================
const signupNameInput = document.getElementById('signup-name');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const signupPasswordConfirmInput = document.getElementById('signup-password-confirm');
const signupButton = document.getElementById('signup-button');

// signupButton이 있는 페이지(signup.html)에서만 이벤트 리스너를 추가합니다.
if (signupButton) {
    signupButton.addEventListener('click', async () => {
        const name = signupNameInput.value;
        const email = signupEmailInput.value;
        const password = signupPasswordInput.value;
        const passwordConfirm = signupPasswordConfirmInput.value;

        errorMessage.textContent = ''; // 이전 오류 메시지 초기화

        // 유효성 검사
        if (!name || !email || !password || !passwordConfirm) {
            errorMessage.textContent = '모든 필드를 입력해주세요.';
            return;
        }
        if (password.length < 6) {
            errorMessage.textContent = '비밀번호는 6자 이상이어야 합니다.';
            return;
        }
        if (password !== passwordConfirm) {
            errorMessage.textContent = '비밀번호가 일치하지 않습니다.';
            return;
        }

        try {
            // 1. Firebase Auth에 사용자 생성
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. 사용자 프로필에 이름 업데이트
            await updateProfile(user, {
                displayName: name
            });

            // 3. Realtime Database에 사용자 정보 저장 (선택적)
            await set(ref(db, 'users/' + user.uid), {
                username: name,
                email: email,
                createdAt: Date.now()
            });

            alert('회원가입에 성공했습니다! 로그인 페이지로 이동합니다.');
            window.location.href = 'login.html';

        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                errorMessage.textContent = '이미 사용 중인 이메일입니다.';
            } else {
                errorMessage.textContent = `회원가입 실패: ${error.message}`;
            }
            console.error("Signup Error:", error);
        }
    });
}

// =========================================================================
// 🔑 로그인 관련 로직 (login.html)
// =========================================================================
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');

// loginButton이 있는 페이지(login.html)에서만 이벤트 리스너를 추가합니다.
if (loginButton) {
    loginButton.addEventListener('click', async () => {
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        errorMessage.textContent = '';

        if (!email || !password) {
            errorMessage.textContent = '이메일과 비밀번호를 모두 입력해주세요.';
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // 성공 알림 후 메인 페이지로 이동합니다.
            alert('로그인 되었습니다.');
            // auth-check.js가 index.html로 리디렉션할 것이므로 여기서는 페이지 이동 코드를 제거해도 됩니다.
            // window.location.href = 'index.html'; 
        } catch (error) {
            console.error("Login Error:", error.code);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                errorMessage.textContent = '등록되지 않은 계정이거나, 이메일 또는 비밀번호가 잘못되었습니다.';
            } else {
                errorMessage.textContent = `로그인 실패: ${error.message}`;
            }
        }
    });
}