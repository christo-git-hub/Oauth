function login() {
    window.location.href = "/login";
}

function fetchDriveFiles() {
    fetch("/drive/files")
        .then(response => response.json())
        .then(data => {
            document.getElementById("output").textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            document.getElementById("output").textContent = "Error: " + error;
        });
}

function logout() {
    fetch("/logout")
        .then(() => {
            document.getElementById("output").textContent = "Logged out!";
        });
}