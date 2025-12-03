import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { auth } from './firebase-config.js';

/**
 * 사용자 인증 상태 변경 감지
 * 모든 페이지에서 사용자의 로그인 상태를 확인하고 UI를 업데이트하거나 페이지를 리디렉션합니다.
 */
onAuthStateChanged(auth, user => {
    const loginIcon = document.getElementById('login-icon');
    const userStatus = document.getElementById('user-status');
    const userDisplayName = document.getElementById('user-display-name');

    if (user) {
        // 사용자가 로그인한 경우
        if (userStatus) userStatus.style.display = 'inline-flex';
        if (userDisplayName) userDisplayName.textContent = `${user.displayName || '사용자'}님`;
        if (loginIcon) loginIcon.style.display = 'none';

        // 만약 로그인/회원가입 페이지에 있다면 메인 페이지로 이동
        if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('signup.html')) {
            window.location.href = 'index.html';
        }
    } else {
        // 사용자가 로그아웃한 경우
        if (userStatus) userStatus.style.display = 'none';
        if (loginIcon) loginIcon.style.display = 'block';

        // 현재 페이지가 로그인이나 회원가입 페이지가 아닐 경우에만 로그인 페이지로 리디렉션
        if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('signup.html')) {
            window.location.href = 'login.html';
        }
    }
});