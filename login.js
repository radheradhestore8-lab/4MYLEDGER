const loginBtn = document.getElementById('loginBtn');
const password = document.getElementById('password');

loginBtn.onclick = () => {
  if (password.value === '3001') {
    window.location.href = "ledger.html";
  } else {
    alert('Incorrect password!');
  }
};
