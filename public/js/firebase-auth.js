const firebaseConfig = {
  apiKey: "AIzaSyACc4gC4R-Eo6wsP44ut-tb2e6vD6Zm0is",
  authDomain: "taskly-2do-70c38.firebaseapp.com",
  databaseURL: "https://taskly-2do-70c38-default-rtdb.firebaseio.com",
  projectId: "taskly-2do-70c38",
  storageBucket: "taskly-2do-70c38.appspot.com",
  messagingSenderId: "401167298428",
  appId: "1:401167298428:web:51a251a61653176be73ef9"
};

export const firebaseApp = firebase.initializeApp(firebaseConfig);

export const auth = firebaseApp.auth();
const provider = new firebase.auth.GoogleAuthProvider();
export const database = firebaseApp.database();

$("#loginButton").click(signInWithGoogle);
$("#loginButton2").click(signInWithGoogle);
function signInWithGoogle() {
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;

            // Store user info in the database
            const userRef = database.ref('users/' + user.uid);
            userRef.update({
                displayName: user.displayName,
                email: user.email,
            })
            .then(() => {
                console.log('User data successfully written to the database.');
                // window.location.href = "main-page.html"; 
                window.location.href = "start-up.html"; 
            })
            .catch((error) => {
                console.log('Error writing user data:', error);
            });
        })
        .catch((error) => {
            console.log('Error during sign-in:', error);
        });
}


$("#anonButton").click(signInAnonymously);
function signInAnonymously() {
    auth.signInAnonymously()
        .then((result) => {
            const user = result.user;

            // Store basic info for the anonymous user in the database
            const userRef = database.ref('users/' + user.uid);
            userRef.update({
                displayName: "Anonymous User",
                email: "Anonymous User",
            })
            .then(() => {
                console.log('Anonymous user signed in and data stored.');
                window.location.href = "start-up.html"; 
            })
            .catch((error) => {
                console.log('Error writing user data:', error);
            });
        })
        .catch((error) => {
            console.error('Error during anonymous sign-in:', error);
        });
}


$(".logout-button").click(signOut);
function signOut() {
    auth.signOut()
      .then(() => {
          sessionStorage.removeItem('currentListId');
          window.location.href = "index.html";
      })
      .catch((error) => {
          console.error('Error during sign-out:', error);
      });
}