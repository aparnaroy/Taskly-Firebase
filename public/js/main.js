import { firebaseApp, auth, database } from './firebase-auth.js';

let currentListId = '';
let currentUserId = '';
let selectedTagIds = [];
const activeTagsMap = {};

// Document ready function
$(function () {
    // If light or dark mode is saved, apply it on page load
    const savedTheme = sessionStorage.getItem('theme');
    if (savedTheme === 'dark') {
        toggleLightDarkMode();
    }

    // Update tag color as soon as it is changed in the color picker
    document.querySelectorAll('#tags .color-picker').forEach(colorPicker => {
        colorPicker.addEventListener('input', updateTagColor);
    });

    toggleNav(); // Make sure sidebar is open by default

    // Make it so you can hit Enter to create a new task in addition to clicking the Add button
    $('#input-container').on( "submit", function(event) {
        event.preventDefault();

        // Make add button become bright for a sec
        const addButton = $('#addButton');
        addButton.css('filter', 'brightness(1.3)');
        // Revert the filter back to normal after
        setTimeout(function() {
            addButton.css('filter', 'brightness(1)');
        }, 200);

        addTask();
    });
});

// Clicking on logo takes you back to home page
$(".logo").click(function() {
    window.location.href = 'index.html';
});

// Show top navbar when you scroll down
window.onscroll = function() {
    const navbar = document.querySelector('.top-nav');
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        navbar.classList.add('scrolled'); // Add the scrolled class
    } else {
        navbar.classList.remove('scrolled'); // Remove the scrolled class
    }
};

$("#sidebarIcon").click(toggleNav);
function toggleNav() {
    const sidebarIcon = document.getElementById('sidebarIcon');
    const mainContent = document.querySelector('.main-content');
    const navbarContainer = document.querySelector('.left-top-navbar');

    // Toggle between black and white
    if (sidebarIcon.src.includes('sidebar-icon-black.png')) {
        sidebarIcon.src = './img/sidebar-icon-white.png';
    } else {
        sidebarIcon.src = './img/sidebar-icon-black.png';
    }
    
    // Toggle sidebar open/close
    $('#side-nav').toggleClass('open');
    navbarContainer.classList.toggle('open');
    // Toggle left-align class for main content when sidebar is opened/closed
    if (window.innerWidth >= 768) {
        mainContent.classList.toggle('left-align');
    }
    navbarContainer.classList.toggle('scrolled');
}

// Function to automatically untoggle side-nav and reset layout on resize
function handleResize() {
    const sideNav = document.getElementById('side-nav');
    const mainContent = document.querySelector('.main-content');
    const sidebarIcon = document.getElementById('sidebarIcon');
    const lightDarkIcon = document.getElementById('lightdarkIcon');
    const navbarContainer = document.querySelector('.left-top-navbar');
    const username = document.querySelector('.username');

    // Hide username if screen is too small
    if (window.innerWidth <= 600) { 
        username.style.display = 'none';
    } else {
        username.style.display = 'flex';
    }
    
    // If the screen is too small, untoggle the sidebar and reset alignment
    if (window.innerWidth <= 1068) {
        sideNav.classList.remove('open'); // Ensure sidebar is hidden
        navbarContainer.classList.remove('open');
        mainContent.classList.remove('left-align'); // Ensure main content is centered

        if (lightDarkIcon.src.includes('lightdark-icon-white.png')) {
            sidebarIcon.src = './img/sidebar-icon-white.png';
        } else {
            sidebarIcon.src = './img/sidebar-icon-black.png';
        }
    }
}

// Add an event listener for window resize
window.addEventListener('resize', handleResize);

$("#lightdarkIcon").click(toggleLightDarkMode);
function toggleLightDarkMode() {
    const sidebarIcon = document.getElementById('sidebarIcon');
    const lightDarkIcon = document.getElementById('lightdarkIcon');
    const body = document.body;
    
    // Toggle light/dark mode
    body.classList.toggle('dark-mode');

    // Save the current mode in sessionStorage
    if (body.classList.contains('dark-mode')) {
        sessionStorage.setItem('theme', 'dark');
    } else {
        sessionStorage.setItem('theme', 'light');
    }
    
    // Swap icon colors
    if (sidebarIcon.src.includes('sidebar-icon-black.png')) {
        sidebarIcon.src = './img/sidebar-icon-white.png';
    } else {
        sidebarIcon.src = './img/sidebar-icon-black.png';
    }

    if (lightDarkIcon.src.includes('lightdark-icon-white.png')) {
        lightDarkIcon.src = './img/lightdark-icon-black.png';
    } else {
        lightDarkIcon.src = './img/lightdark-icon-white.png';
    }
}



// Task CRUD Functions

$('#taskList').on('click', '.circle', function(event) {
    updateTaskCompleted(event);
});

$('#taskList').on('click', '.tag-button', function(event) {
    toggleTagDropdown(event);
});

$('#taskList').on('input', '.task-input.task-text', function(event) {
    updateTaskText(event);
});

$('#taskList').on('click', '.delete-button', function(event) {
    deleteTask(event);
});

// TASK CREATE
$('#addButton').on('click', addTask);
function addTask() {
    const input = document.getElementById('newTaskInput');
    const taskList = document.getElementById('taskList');
    const taskText = input.value;

    if (taskText.trim() === '') return; // Ignore empty input

    // Reference to the tasks for the current user and list
    const tasksRef = database.ref(`users/${currentUserId}/lists/${currentListId}/tasks`);

    // First, fetch all tasks to determine the max order value
    tasksRef.once('value').then((snapshot) => {
        let maxOrder = 0;

        // Iterate over tasks to find the highest order value
        snapshot.forEach((taskSnapshot) => {
            const task = taskSnapshot.val();
            if (task.order !== undefined && task.order > maxOrder) {
                maxOrder = task.order;
            }
        });

        // Create a new reference for the task under the specific user and list
        const taskRef = tasksRef.push();

        // Save the task to Firebase under the taskId
        taskRef.set({
            description: taskText,
            tagsAttached: [],
            done: false,
            order: maxOrder + 1
        }).then(() => {
            // Hide the no tasks message if it exists
            document.getElementById('no-tasks-message').style.display = 'none';

            // Create and display the new task in the UI after saving to Firebase
            const newTask = document.createElement('li');
            newTask.setAttribute('data-task-id', taskRef.key); // Store the task ID for later use

            newTask.innerHTML = `<div class="circle"></div>
                                <div class="task-input task-text" contenteditable="true">${taskText}</div>
                                <img src="./img/tag.png" class="tag-button" />
                                <div class="tag-dropdown"></div>
                                <img src="./img/delete.png" class="delete-button" alt="Delete"/>`;
            taskList.appendChild(newTask);
        }).catch((error) => {
            console.error('Error adding task:', error);
        });
    });
    input.value = ''; // Clear the input field
}


// TASK UPDATE Text
function updateTaskText(event) {
    const taskTextElement = event.currentTarget;
    const listItem = taskTextElement.closest('li');
    const taskId = listItem.getAttribute('data-task-id'); // Get the task ID from the data attribute

    const newTaskText = taskTextElement.textContent.trim(); // Get the updated task text

    // Create a reference to the task in the Firebase database
    const taskRef = database.ref(`users/${currentUserId}/lists/${currentListId}/tasks/${taskId}`);

    // Update the task description in Firebase
    taskRef.update({
        description: newTaskText
    }).then(() => {
        console.log('Task updated in the database.');
    }).catch((error) => {
        console.error('Error updating task:', error);
    });
}

// TASK UPDATE Completion
function updateTaskCompleted(event) {
    const listItem = event.currentTarget.closest('li');
    listItem.classList.toggle('completed'); // Toggle the completed class

    const taskInput = listItem.querySelector('.task-text');
    const tagElements = listItem.querySelectorAll('.tag-rectangle'); // Get all tag elements

    // Apply or remove the dull class based on completion status
    tagElements.forEach(tag => {
        tag.classList.toggle('dull', listItem.classList.contains('completed'));
    });

    if (taskInput) {
        taskInput.classList.toggle('completed'); // Toggle the completed class for the input
    }

    // Trigger confetti effect if task completed
    if (listItem.classList.contains('completed')) {
        createConfetti();
    }

    // Get the task ID from the data attribute
    const taskId = listItem.getAttribute('data-task-id');

    // Create a reference to the task in the database
    const taskRef = database.ref(`users/${currentUserId}/lists/${currentListId}/tasks/${taskId}`);

    // Update the "done" field in Firebase
    const isCompleted = listItem.classList.contains('completed');
    taskRef.update({ done: isCompleted })
        .then(() => {
            console.log(`Task ${isCompleted ? 'completed' : 'not completed'} in the database.`);
        })
        .catch((error) => {
            console.error('Error updating task completed status:', error);
        });
}


function createConfetti() {
    const numConfetti = 900; // Number of confetti pieces
    const colors = [
        '#FF5733', // Red
        '#FFC300', // Yellow
        '#DAF7A6', // Light Green
        '#33FF57', // Green
        '#337FFF', // Blue
        '#FF33A1', // Pink
        '#FF8C33', // Orange
        '#8D33FF'  // Purple
    ];

    for (let i = 0; i < numConfetti; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';

        // Randomize size
        const sizeClass = Math.random() > 0.5 ? 'confetti-small' : Math.random() > 0.5 ? 'confetti-large' : '';
        if (sizeClass) {
            confetti.classList.add(sizeClass);
        }

        // Randomize horizontal position
        confetti.style.left = `${Math.random() * 100}vw`; // Full width of viewport
        confetti.style.top = `-20px`; // Start from the top

        // Randomize color
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        // Add a random delay for each piece
        confetti.style.animationDelay = `${Math.random() * 2}s`;

        document.body.appendChild(confetti);

        // Remove the confetti after the animation ends
        confetti.addEventListener('animationend', () => {
            confetti.remove();
        });
    }
}


// TASK DESTROY
function deleteTask(event) {
    const listItem = event.currentTarget.closest('li');
    const taskId = listItem.getAttribute('data-task-id'); // Get the task ID from the data attribute

    // Create a reference to the task in the database
    const taskRef = database.ref(`users/${currentUserId}/lists/${currentListId}/tasks/${taskId}`);

    // Remove the task from the Firebase database
    taskRef.remove()
        .then(() => {
            // If the task was successfully removed from Firebase, fade it out from the UI
            listItem.style.transition = 'opacity 0.5s ease'; // Add a transition for smooth removal
            listItem.style.opacity = '0'; // Fade out

            // Remove the item after the fade-out transition
            setTimeout(() => {
                listItem.remove();

                // Check if there are any remaining tasks
                const taskList = document.getElementById('taskList');
                if (taskList.children.length === 0) {
                    // If no tasks remain, show the no tasks message
                    document.getElementById('no-tasks-message').style.display = 'block'; // Show message
                }
            }, 500); // Match the duration with the CSS transition
        })
        .catch((error) => {
            console.error('Error removing task:', error);
        });
}



// List CRUD Functions

// LIST CREATE
$(".add-list").click(addNewList);
function addNewList() {
    const listName = prompt("Enter the name of your new list:");

    // Validate that the list name is not empty or whitespace
    if (listName && listName.trim() !== '') {
        // Reference to the lists for the current user
        const listsRef = database.ref(`users/${currentUserId}/lists`);

        // Fetch all lists to determine the max order value
        listsRef.once('value').then((snapshot) => {
            let maxOrder = 0;

            // Iterate over lists to find the highest order value
            snapshot.forEach((listSnapshot) => {
                const list = listSnapshot.val();
                if (list.order !== undefined && list.order > maxOrder) {
                    maxOrder = list.order;
                }
            });

            // Generate a unique ID for the new list
            const newListRef = listsRef.push(); // Create a new list under the current user

            // Prepare the list data with the order field
            const newListData = {
                listName: listName, // Set the list name
                tasks: {}, // Initialize an empty tasks object for this list
                order: maxOrder + 1 // Set the order to max order + 1
            };

            // Save the new list data in Firebase
            newListRef.set(newListData).then(() => {
                // On success, add the new list to the sidebar
                const lists = document.getElementById('list-items');

                const newList = document.createElement('div');
                newList.classList.add('list-item');
                newList.innerHTML = `<a href="#" class="list-link" data-list-id="${newListRef.key}">${listName}</a>`;
                lists.appendChild(newList); // Append to the sidebar
                console.log(newList)

                // Automatically select and load the new list
                currentListId = newListRef.key;
                sessionStorage.setItem('currentListId', currentListId);

                // Update the list title at the top
                document.getElementById('list-title').textContent = listName;

                // Remove 'selected-list' class from other lists and add it to the new one
                $('.list-item').removeClass('selected-list'); // Remove class from other list items
                newList.classList.add('selected-list'); // Add class to the new list item

                const noListsMessage = document.getElementById('no-lists-message');
                noListsMessage.style.display = 'none'; // Hide the message
                // Show the list title and box again
                const listTitle = document.getElementById('list-title');
                const box = document.querySelector('.box');
                listTitle.style.display = 'block'; // Show the list title
                box.style.display = 'block'; // Show the box

                // Display tasks for the new list (empty initially)
                displayTasksForList(currentUserId, newListRef.key);

                // Add right-click listeners for all lists, including the new one
                const listItems = document.querySelectorAll('.list-item');
                addRightClickListener(listItems);
            }).catch((error) => {
                console.error('Error adding new list to Firebase:', error);
                alert("There was an error adding your list. Please try again.");
            });
        }).catch((error) => {
            console.error('Error fetching lists:', error);
            alert("There was an error fetching the lists. Please try again.");
        });
    } else {
        alert("List name cannot be empty.");
    }
}


// LIST UPDATE
$("#list-title").on('input', updateListTitle);
function updateListTitle() {
    const newTitle = document.getElementById('list-title').textContent;

    if (newTitle && newTitle.trim() !== '') {
        // Update the list title in the database (Firebase)
        const listRef = database.ref(`users/${currentUserId}/lists/${currentListId}`);
        listRef.update({ listName: newTitle }).then(() => {

            // Update the title in the navbar
            const navbarTitle = document.querySelector(`#list-items a[data-list-id="${currentListId}"]`);
            navbarTitle.textContent = newTitle;

        }).catch((error) => {
            console.error('Error updating list title in the database:', error);
        });
    } else {
        alert("List title cannot be empty.");
    }
}



// Tag CRUD Functions

// TAG CREATE
$(document).on('click', '.add-tag', addNewTag);
function addNewTag() {
    const tagName = prompt("Enter the name of your new tag:");

    if (tagName && tagName.trim() !== '') {
        const tagsRef = database.ref(`users/${currentUserId}/tags`);

        // First, fetch all tags to determine the max order value
        tagsRef.once('value').then((snapshot) => {
            let maxOrder = 0;

            // Iterate over existing tags to find the highest order value
            snapshot.forEach((tagSnapshot) => {
                const tag = tagSnapshot.val();
                if (tag.order !== undefined && tag.order > maxOrder) {
                    maxOrder = tag.order;
                }
            });

            // Push a new tag to generate a unique key
            const newTagRef = tagsRef.push(); // This generates a unique key for the new tag
            const tagId = newTagRef.key; // Get the new unique key
            
            // Create the tag item using innerHTML
            const tagItem = document.createElement('div');
            tagItem.className = 'tag-item';
            tagItem.setAttribute('data-tag-id', tagId); // Set the data-tag-id attribute

            const tagColor = getRandomColor(); // Generate a random color
            tagItem.innerHTML = `
                <a href="#" class="tag-name">${tagName}</a>
                <input type="color" class="color-picker" value="${tagColor}" />
            `;

            // Append the new tag item to the tags div
            document.getElementById('tag-items').appendChild(tagItem);

            // Add event listener to the color picker
            const colorPicker = tagItem.querySelector('.color-picker');
            colorPicker.addEventListener('input', updateTagColor);

            // Add right-click listener to all tags, including the new one
            const tagItems = document.querySelectorAll('.tag-item');
            addRightClickListener(tagItems);

            // Save the new tag to the database with the order value
            newTagRef.set({
                tagName: tagName,
                tagColor: tagColor,
                order: maxOrder + 1 // Set the order as maxOrder + 1
            }).then(() => {
                console.log('New tag added to the database successfully.');
            }).catch((error) => {
                console.error('Error adding new tag to the database:', error);
            });
        }).catch((error) => {
            console.error('Error fetching tags from the database:', error);
        });
        
    } else {
        alert("Tag name cannot be empty.");
    }
}


// Function to generate a random color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Function to retrieve tags from the Firebase database
function getTags(callback) {
    const tagsRef = firebase.database().ref(`users/${currentUserId}/tags`);
    
    tagsRef.once('value', (snapshot) => {
        const tags = [];
        snapshot.forEach((childSnapshot) => {
            const tag = childSnapshot.val();
            tags.push({
                tagId: childSnapshot.key, // Include the tag ID
                tagName: tag.tagName,
                tagColor: tag.tagColor,
            });
        });
        callback(tags); // Call the callback with the fetched tags
    });
}


// Function to toggle the visibility of the tag dropdown
function toggleTagDropdown(event) {
    const dropdown = event.target.nextElementSibling; // Find the corresponding dropdown div
    
    dropdown.innerHTML = ''; // Clear existing dropdown content

    // Fetch tags asynchronously
    getTags((tags) => {
        // Populate the dropdown with tags once they are fetched
        tags.forEach(tag => {
            const tagOption = document.createElement('a');
            tagOption.textContent = tag.tagName;
            tagOption.onclick = (e) => addTagToTask(event, tag.tagName); // Attach event handler for selecting a tag
            dropdown.appendChild(tagOption);
        });

        // Untoggle other tag dropdowns
        const tagDropdowns = document.querySelectorAll('.tag-dropdown.visible');
        tagDropdowns.forEach(dropdown => {
            dropdown.classList.remove('visible'); // Hide all visible dropdowns
        });

        // Toggle visibility of the clicked dropdown
        dropdown.classList.toggle('visible');
    });
}




// TAG UPDATE
function updateTagColor(event) {
    const colorPicker = event.target;
    const selectedColor = colorPicker.value;
    
    // Get the tag element and its ID
    const tagItem = colorPicker.closest('.tag-item');
    const tagId = tagItem.getAttribute('data-tag-id'); // Get the tag ID from the data attribute
    
    // Get the tag name corresponding to the color picker
    const tagName = tagItem.querySelector('.tag-name').textContent;
    
    // Find all list items that contain the tag
    const listItems = document.querySelectorAll('#taskList li');
    listItems.forEach(listItem => {
        const existingTag = Array.from(listItem.querySelectorAll('.tag-rectangle'))
            .find(tag => tag.textContent === tagName);
        
        if (existingTag) {
            existingTag.style.backgroundColor = selectedColor; // Update the tag color
        }
    });
    
    // Update the tag color in the database
    const tagRef = database.ref(`users/${currentUserId}/tags/${tagId}`);
    tagRef.update({
        tagColor: selectedColor
    }).then(() => {
        console.log(`Tag color updated successfully for ${tagName} in the database.`);
    }).catch((error) => {
        console.error('Error updating tag color in the database:', error);
    });
}




// TASK UPDATE Tag
function addTagToTask(event, tagText) {
    event.preventDefault(); // Prevent the default link behavior

    // Find the closest list item (task) where the tag was clicked
    const listItem = event.target.closest('li');
    const taskId = listItem.getAttribute('data-task-id');

    // Firebase reference to the task in the database
    const taskRef = firebase.database().ref(`users/${currentUserId}/lists/${currentListId}/tasks/${taskId}`);

    // Check if the tag already exists
    const existingTag = Array.from(listItem.querySelectorAll('.tag-rectangle'))
        .find(tag => tag.textContent === tagText);
    
    if (existingTag) {
        // Also remove the tag from the Firebase database
        taskRef.child('tagsAttached').once('value', (snapshot) => {
            const tags = snapshot.val() || []; // Get existing tags or initialize as empty array
            // console.log("Tags", tags);
            // console.log("Existing Tag", existingTag);
            const tagIdToRemove = existingTag.getAttribute('data-tag-id'); // Get the tag ID to remove
            // console.log("TagId to Remove", tagIdToRemove);
            const updatedTags = tags.filter(tagId => tagId !== tagIdToRemove); // Remove the tag by ID
            // console.log("Updated Tags", updatedTags);

            // If the tag exists, remove it from the task UI
            listItem.removeChild(existingTag);

            // Update the Firebase database with the new array of tags
            taskRef.update({ tagsAttached: updatedTags })
                .then(() => console.log("Tag removed successfully from database"))
                .catch(error => console.error("Error removing tag from database:", error));
        });
    } else {
        // Get the corresponding color picker for the tag
        const tagElements = document.querySelectorAll('#tag-items .tag-item');
        let color = '#000000'; // Default color
        let tagId = null; // Initialize tagId

        tagElements.forEach(tagItem => {
            const currentTagName = tagItem.querySelector('.tag-name').textContent;
            if (currentTagName === tagText) {
                const colorPicker = tagItem.querySelector('.color-picker');
                color = colorPicker.value; // Get the value from the color picker
                tagId = tagItem.getAttribute('data-tag-id'); // Get the tag ID
            }
        });

        // Create a new tag element for the UI
        const tagElement = document.createElement('div');
        tagElement.className = 'tag-rectangle'; // Add a class for styling
        tagElement.style.backgroundColor = color; // Set the color from the color picker
        tagElement.textContent = tagText; // Set the tag text
        tagElement.setAttribute('data-tag-id', tagId); // Set the data attribute for the tag ID

        // Check if the task is marked as completed and add dull class if needed
        if (listItem.classList.contains('completed')) {
            tagElement.classList.add('dull');
        }

        // Find the tag button element 
        const tagButtonElement = listItem.querySelector('.tag-button');

        // Insert the tag element before the tag button element
        listItem.insertBefore(tagElement, tagButtonElement);

        // Also add the tag ID to the Firebase database
        taskRef.child('tagsAttached').once('value', (snapshot) => {
            const tags = snapshot.val() || []; // Get existing tags or initialize as empty array
            if (!tags.includes(tagId)) {
                tags.push(tagId); // Add the tag ID if it doesn't already exist
                taskRef.update({ tagsAttached: tags });
            }
        });
    }
    
    // Hide the dropdown after selecting a tag
    const dropdown = listItem.querySelector('.tag-dropdown');
    if (dropdown) {
        dropdown.classList.remove('visible');
    }
}




// User profile dropdown menu
$(".user-circle").click(toggleDropdown);
function toggleDropdown() {
    const dropdown = document.getElementById("userDropdown");
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}


window.onclick = function(event) {
    const userDropdown = document.getElementById("userDropdown");
    if (!event.target.matches('.user-circle')) {
        if (userDropdown.style.display === "block") {
            userDropdown.style.display = "none";
        }
    }

    if (!event.target.closest('.tag-button') && !event.target.closest('.tag-dropdown')) {
        // Get all dropdowns
        const tagDropdowns = document.querySelectorAll('.tag-dropdown.visible');
        tagDropdowns.forEach(dropdown => {
            dropdown.classList.remove('visible'); // Hide all visible dropdowns
        });
    }
};


// Context Menu for Right-Clicking on a list or tag item and deleting it

const contextMenu = document.getElementById('context-menu');
let targetElement = null; // To store which element is right-clicked


// Function to add right-click event listener
function addRightClickListener(items) {
    items.forEach(item => {
        item.addEventListener('contextmenu', function(event) {
            event.preventDefault(); // Prevent default context menu

            // Store the right-clicked element (list-item or tag-item)
            targetElement = event.target.closest('.list-item, .tag-item');

            let x = event.pageX + 10;
            let y = event.pageY + 10;
            // Position the custom context menu
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${x}px`;
            contextMenu.style.top = `${y}px`;
        });
    });
}

// Hide context menu on clicking elsewhere
document.addEventListener('click', function() {
    contextMenu.style.display = 'none';
});


// LIST DELETE + TAG DELETE
$('#delete-option').on('click', deleteListOrTag);
function deleteListOrTag() { 
    if (targetElement) {
        // If it's a List item
        if (targetElement.classList.contains('list-item')) {
            const listLink = targetElement.querySelector('.list-link');
            const listId = listLink.getAttribute('data-list-id');

            const listRef = database.ref(`users/${currentUserId}/lists/${listId}`);
            targetElement.remove(); // Remove the list from the DOM
            
            // Check if the deleted list was the current list
            if (currentListId === listId) {
                listRef.remove().then(() => {
                    console.log('List removed from the database.');
                    // Reload user lists to show the first item
                    currentListId = null;
                    sessionStorage.removeItem('currentListId');
                    loadUserLists(currentUserId);
                }).catch((error) => {
                    console.error('Error removing list:', error);
                });
            } else {
                // If not the current list, just remove it from the database
                listRef.remove().then(() => {
                    console.log('List removed from the database.');
                }).catch((error) => {
                    console.error('Error removing list:', error);
                });
            }
        
        // If it's a Tag item
        } else if (targetElement.classList.contains('tag-item')) {
            const tagId = targetElement.getAttribute('data-tag-id');
            const tagRef = database.ref(`users/${currentUserId}/tags/${tagId}`);

            targetElement.remove();  // Remove the tag from the DOM

            delete activeTagsMap[tagId]; // Remove from activeTagsMap
            selectedTagIds.splice(selectedTagIds.indexOf(tagId), 1);
            displayTasksForList(currentUserId, currentListId); // Update the task list

            // Remove tag from all tasks and then remove the tag from the database
            removeTagFromAllTasks(tagId).then(() => {
                console.log('Tag removed from all tasks in the database.');

                // Now remove the tag from the database
                return tagRef.remove();
            }).then(() => {
                console.log('Tag removed from the database.');

                // Update the UI for all tasks with this tag after database updates
                updateUITagRemoval(tagId);
            }).catch((error) => {
                console.error('Error removing tag:', error);
            });
        }

        // Clear the reference and hide the context menu
        targetElement = null;
        contextMenu.style.display = 'none';
    }
}

// Function to remove a tag from all tasks
function removeTagFromAllTasks(tagId) {
    const tasksRef = database.ref(`users/${currentUserId}/lists/${currentListId}/tasks`);

    return tasksRef.once('value').then((tasksSnapshot) => {
        const updates = {};

        tasksSnapshot.forEach((taskSnapshot) => {
            const task = taskSnapshot.val();
            const taskId = taskSnapshot.key;

            // Check if the task has the tag attached
            if (task.tagsAttached && Array.isArray(task.tagsAttached) && task.tagsAttached.includes(tagId)) {
                // Remove the tag from the task's tagsAttached array
                const updatedTags = task.tagsAttached.filter(id => id !== tagId);
                updates[`/${taskId}/tagsAttached`] = updatedTags; // Prepare the update for this task
            }
        });

        // Apply all updates in one operation
        return tasksRef.update(updates);
    });
}

// Function to update the UI for tag removal
function updateUITagRemoval(tagId) {
    const taskListItems = document.querySelectorAll('#taskList li'); // Select all task list items
    taskListItems.forEach(listItem => {
        const tagElement = Array.from(listItem.querySelectorAll('.tag-rectangle'))
            .find(tag => tag.getAttribute('data-tag-id') === tagId); // Find the tag in the task

        if (tagElement) {
            listItem.removeChild(tagElement); // Remove the tag from the task UI
        }
    });
}





// Firebase READ Database Functions!!!
$(document).ready(function() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUserId = user.uid; // Store the current user ID
            initializeUser(user.uid); // Initialize user data
        } else {
            window.location.href = 'index.html'; // Redirect to login
        }
    });

    handleResize(); // Call the function on page load to ensure layout is correct
});

// Function to initialize user data
function initializeUser(userId) {
    const userRef = database.ref(`users/${userId}`);

    userRef.once('value').then((snapshot) => {
        const userData = snapshot.val();

        if (userData) {
            displayUserInfo(userData); // Display user information

            // Check if the user already has a profile circle color
            if (!userData.circleColor) {
                console.log('Generating profile color for new user.');
                const randomColor = getRandomColor(); // Generate a random color
                userRef.update({ circleColor: randomColor }) // Save to Firebase
                    .then(() => {
                        document.querySelector('.user-circle').style.backgroundColor = randomColor; // Set color in DOM
                    })
                    .catch((error) => {
                        console.error('Error saving color to Firebase:', error);
                    });
            } else {
                // If the color exists, use it
                document.querySelector('.user-circle').style.backgroundColor = userData.circleColor; // Set color in DOM
            }

            loadUserLists(userId); // Load user's lists
            loadUserTags(userId); // Load user's tags
            addListClickEvent(userId); // Add event listeners for list links
        }
    }).catch((error) => {
        console.error('Error fetching user data:', error);
    });
}

// Function to display user info
function displayUserInfo(userData) {
    document.querySelector('.username').textContent = `Welcome, ${userData.displayName}`;
    document.querySelector('.user-circle').textContent = userData.displayName.charAt(0);
    document.querySelector('.user-email').textContent = userData.email;
}


// Function to load user's lists
function loadUserLists(userId) {
    const listsRef = database.ref(`users/${userId}/lists`).orderByChild('order'); // Show lists in order
    listsRef.once('value').then((listsSnapshot) => {
        const listsContainer = document.getElementById('list-items');
        listsContainer.innerHTML = ''; // Clear previous lists

        const noListsMessage = document.getElementById('no-lists-message');
        const listTitle = document.getElementById('list-title');
        const box = document.querySelector('.box');

        // Check if there are any lists
        if (!listsSnapshot.exists()) {
            console.log('No lists found.');
            // Hide the lists container and show the no lists message
            listTitle.style.display = 'none';
            box.style.display = 'none';
            noListsMessage.style.display = 'block';
            return; // Exit the function
        } else {
            noListsMessage.style.display = 'none'; // Hide the message
        }

        let firstListId = null; // To store the first listId
        
        listsSnapshot.forEach((listSnapshot) => {
            const listId = listSnapshot.key; // Get the listId
            const listData = listSnapshot.val(); // Get the list data (which contains listName)

            const listName = listData.listName; // Get the list name from the data

            // Append list items to the side navbar
            appendListItem(listsContainer, listId, listName);

            // Store the first listId
            if (!firstListId) {
                firstListId = listId; // Store the first listId for later use
            }
        });

        // Retrieve the stored currentListId from sessionStorage
        const storedListId = sessionStorage.getItem('currentListId');

        // If there are lists, display the tasks for the stored list ID or the first list
        if (listsSnapshot.exists()) {
            const listToDisplayId = storedListId || firstListId;

            displayTasksForList(userId, listToDisplayId);
            const displayedList = listsSnapshot.child(listToDisplayId).val();
            document.getElementById('list-title').textContent = displayedList.listName; // Set the title

            document.title = `Taskly | ${displayedList.listName}`; // Update the tab title
            
            // Set the selected class for the displayed list item
            const displayedListItem = listsContainer.querySelector(`.list-link[data-list-id="${listToDisplayId}"]`);
            if (displayedListItem) {
                displayedListItem.closest('.list-item').classList.add('selected-list'); // Add the selected class to the displayed list item
                currentListId = listToDisplayId; // Store currentListId
                sessionStorage.setItem('currentListId', currentListId);
            }
        }

        // Add right-click listeners after the lists are loaded
        const listItems = document.querySelectorAll('.list-item');
        addRightClickListener(listItems);

    }).catch((error) => {
        console.error('Error fetching lists:', error);
    });
}

// Function to append a list item to the lists container
function appendListItem(listsContainer, listId, listName) {
    const listItem = document.createElement('div');
    listItem.classList.add('list-item');
    listItem.innerHTML = `<a href="#" class="list-link" data-list-id="${listId}">${listName}</a>`; // Store listId in the DOM
    listsContainer.appendChild(listItem);
}

// Function to add click event listener for list links
function addListClickEvent(userId) {
    $(document).on('click', '.list-link', function(event) {
        event.preventDefault();
        
        // Remove the 'selected-list' class from all list items
        $('.list-item').removeClass('selected-list'); // Change this line to target .list-item instead

        // Add the 'selected-list' class to the parent .list-item of the clicked link
        $(this).closest('.list-item').addClass('selected-list'); // Use closest to find the parent

        const selectedListId = $(this).data('list-id'); // Get the listId from the clicked item
        currentListId = selectedListId; // Update the currentListId

        // Store the current list ID in sessionStorage
        sessionStorage.setItem('currentListId', selectedListId);

        displayTasksForList(userId, selectedListId); // Fetch and display tasks for the selected list

        const selectedListName = $(this).text(); // Get the list name from the clicked item
        document.getElementById('list-title').textContent = selectedListName; // Update the title

        document.title = `Taskly | ${selectedListName}`; // Update the tab title
    });
}


// Initialize event listeners once when the document is ready
$(document).ready(function() {
    // Event delegation for tag clicks
    $('#tag-items').on('click', '.tag-name', function(event) {
        event.preventDefault();

        const tagItem = $(this).closest('.tag-item');
        const tagId = tagItem.data('tag-id');

        if (activeTagsMap[tagId]) {
            // Tag is already selected, remove the filter
            delete activeTagsMap[tagId]; // Remove from activeTagsMap
            selectedTagIds.splice(selectedTagIds.indexOf(tagId), 1);
            tagItem.removeClass('active-tag');
        } else {
            // Select this tag, set it as the filter
            activeTagsMap[tagId] = true; // Add to activeTagsMap
            selectedTagIds.push(tagId);
            tagItem.addClass('active-tag');
        }

        // Re-display tasks with the filter
        displayTasksForList(currentUserId, currentListId);
    });
});

// Function to display tasks for a specific list with tag filtering
function displayTasksForList(userId, listId) {
    const tasksRef = database.ref(`users/${userId}/lists/${listId}/tasks`).orderByChild('order'); // Show tasks in order

    tasksRef.once('value').then((tasksSnapshot) => {
        const taskList = document.getElementById('taskList'); // Get the task list element
        const noTasksMessage = document.getElementById('no-tasks-message');
        taskList.innerHTML = ''; // Clear existing tasks

        // Load tags once and create a tagsMap
        loadUserTags(userId).then(tagsMap => {
            // Check if there are tasks
            if (!tasksSnapshot.exists()) {
                console.log("No tasks found.");
                noTasksMessage.style.display = 'block'; // Show message
            } else {
                noTasksMessage.style.display = 'none'; // Hide message

                // If tasks exist, iterate and append them
                tasksSnapshot.forEach((taskSnapshot) => {
                    const task = taskSnapshot.val();
                    const taskId = taskSnapshot.key; // Get task ID
                    const taskTags = task.tagsAttached || [];

                    // If a tag is selected, only display tasks with that tag (change `every` to `some` to display tasks with ANY selected tag instead of ALL selected tags)
                    if (selectedTagIds.length === 0 || selectedTagIds.every(tag => taskTags.includes(tag))) {
                        appendTaskItem(taskList, taskId, task.description, task.done, taskTags, tagsMap); // Pass tagsMap
                    }
                });
            }
        });
    }).catch((error) => {
        console.error('Error fetching tasks:', error);
    });
}


// Function to append a task item to the task list
function appendTaskItem(taskList, taskId, description, isDone, tagsAttached, tagsMap) {
    const newTask = document.createElement('li');
    newTask.setAttribute('data-task-id', taskId); // Store the task ID

    // Create the inner HTML for the task
    newTask.innerHTML = `
        <div class="circle"></div>
        <div class="task-input task-text" contenteditable="true">${description}</div>
        <img src="./img/tag.png" class="tag-button" />
        <div class="tag-dropdown"></div>
        <img src="./img/delete.png" class="delete-button" alt="Delete"/>
    `;

    const taskTextElement = newTask.querySelector('.task-text'); // Get the task-text div element

    // Add the completed class to the task-text div if the task is done
    if (isDone) {
        newTask.classList.add('completed'); // Add completed class for completed tasks
        taskTextElement.classList.add('completed');
    }

    const tagButtonElement = newTask.querySelector('.tag-button');

    // Check if there are tags attached to the task
    if (tagsAttached && tagsAttached.length > 0) { // Ensure it's an array and has items
        tagsAttached.forEach(tagId => {
            // Look up the tag information in tagsMap
            const tagInfo = tagsMap[tagId]; // Get tag info from the map
            if (tagInfo) {
                const { tagName, tagColor } = tagInfo; // Destructure tagName and tagColor

                // Create a new tag element
                const tagElement = document.createElement('div');
                tagElement.className = 'tag-rectangle'; // Add a class for styling
                tagElement.style.backgroundColor = tagColor; // Set the color from the tag info
                tagElement.textContent = tagName; // Set the tag name
                tagElement.setAttribute('data-tag-id', tagId); // Set the data-tag-id attribute to the tagId

                // Check if the task is marked as completed and add dull class if needed
                if (newTask.classList.contains('completed')) {
                    tagElement.classList.add('dull');
                }

                // Add the tag element to the task
                newTask.insertBefore(tagElement, tagButtonElement);
            }
        });
    }

    taskList.appendChild(newTask);
}



// Function to load user's tags
function loadUserTags(userId) {
    const tagsRef = database.ref(`users/${userId}/tags`).orderByChild('order'); // Show tags in order

    return tagsRef.once('value').then((tagsSnapshot) => { // Return the promise
        const tagsContainer = document.getElementById('tag-items');
        tagsContainer.innerHTML = ''; // Clear previous tags

        const tagsMap = {}; // Create a map to store tagId, tagName, and tagColor

        // Check if there are any existing tags
        if (!tagsSnapshot.exists()) {
            console.log("No tags found. Adding starter tags.");
            addStarterTags(userId); // Add starter tags if none exist
        }

        // Load existing tags into the tagsMap
        tagsSnapshot.forEach((tagSnapshot) => {
            const tagId = tagSnapshot.key;
            const tagData = tagSnapshot.val();
            const tagName = tagData.tagName;
            const tagColor = tagData.tagColor || '#808080';

            tagsMap[tagId] = { tagName, tagColor };
            appendTagItem(tagsContainer, tagId, tagName, tagColor);

            // Check if the tag is active and add the class if necessary
            if (activeTagsMap[tagId]) {
                const tagItem = tagsContainer.querySelector(`.tag-item[data-tag-id="${tagId}"]`);
                if (tagItem) {
                    tagItem.classList.add('active-tag');
                }
            }
        });

        // Add right-click listeners after the tags are loaded
        const tagItems = document.querySelectorAll('.tag-item');
        addRightClickListener(tagItems);

        // Return the tagsMap for later use
        return tagsMap; // Return the map
    }).catch((error) => {
        console.error('Error fetching tags:', error);
        return {}; // Return an empty map in case of error
    });
}

// Function to add starter tags for new users
function addStarterTags(userId) {
    const starterTags = [
        { tagName: "Urgent", tagColor: "#bf1111" },
        { tagName: "Important", tagColor: "#ffcc00" },
        { tagName: "Personal", tagColor: "#11a2bf" },
        { tagName: "Work", tagColor: "#910ea1" }
    ];

    const tagsRef = database.ref(`users/${userId}/tags`);

    // Create a batch of promises for adding tags
    const tagPromises = starterTags.map((tag, index) => {
        const tagId = tagsRef.push().key; // Generate a unique ID for each tag
        return tagsRef.child(tagId).set({
            tagName: tag.tagName,
            tagColor: tag.tagColor
        });
    });

    // Wait for all tags to be added
    return Promise.all(tagPromises)
        .then(() => {
            console.log("Starter tags added successfully.");
            // Optionally, you can reload the tags after adding them
            return loadUserTags(userId);
        })
        .catch((error) => {
            console.error('Error adding starter tags:', error);
        });
}




// Function to append a tag item to the tags container
function appendTagItem(tagsContainer, tagId, tagName, tagColor) {
    const tagItem = document.createElement('div');
    tagItem.classList.add('tag-item');
    tagItem.setAttribute('data-tag-id', tagId); // Set the tagId in the DOM

    // Create inner HTML for the tag
    tagItem.innerHTML = `
        <a href="#" class="tag-name">${tagName}</a>
        <input type="color" class="color-picker" value="${tagColor}" />
    `;

    // Append the tag item to the tags container
    tagsContainer.appendChild(tagItem);

    // Add event listener to the color picker
    const colorPicker = tagItem.querySelector('.color-picker');
    colorPicker.addEventListener('input', updateTagColor);
}



document.addEventListener('DOMContentLoaded', function() {
    // Make tasks draggable to reorder them in the list!!
    const taskList = document.getElementById('taskList');
    // Initialize Sortable on the task list
    const sortableTask = new Sortable(taskList, {
        animation: 150, // Smooth animation
        ghostClass: 'dragging-background',
        onEnd: function(event) {
            updateTaskOrderInDatabase();
        }
    });

    // Make lists draggable to reorder them in the sidebar
    const listContainer = document.getElementById('list-items');
    const sortableList = new Sortable.create(listContainer, {
        animation: 150, // Animation speed in milliseconds
        ghostClass: 'dragging-background',
        onEnd: function (event) {
            updateListOrderInDatabase();
        }
    });

    // Make tags draggable to reorder them in the sidebar
    const tagsContainer = document.getElementById('tag-items');
    const sortableTags = new Sortable(tagsContainer, {
        animation: 150, // Animation speed in milliseconds
        ghostClass: 'dragging-background',
        onEnd: function(event) {
            updateTagOrderInDatabase();
        },
    });
});


// Update the task order in Firebase
function updateTaskOrderInDatabase() {
    const tasks = document.querySelectorAll('#taskList li');
    tasks.forEach((task, index) => {
        const taskId = task.getAttribute('data-task-id');
        const taskRef = database.ref(`users/${currentUserId}/lists/${currentListId}/tasks/${taskId}`);
        taskRef.update({ order: index });
    });
}

// Update the list order in Firebase
function updateListOrderInDatabase() {
    const lists = document.querySelectorAll('.list-item');
    lists.forEach((list, index) => {
        const listId = list.querySelector('.list-link').getAttribute('data-list-id');
        const listRef = database.ref(`users/${currentUserId}/lists/${listId}`);
        listRef.update({ order: index });
    });
}

// Update the tag order in Firebase
function updateTagOrderInDatabase() {
    const tags = document.querySelectorAll('.tag-item');
    tags.forEach((tag, index) => {
        const tagId = tag.getAttribute('data-tag-id');
        const tagRef = database.ref(`users/${currentUserId}/tags/${tagId}`);
        tagRef.update({ order: index });
    });
}