const pantryList = document.getElementById('pantry-list');

function render(highlightIndex) {
    let pantryItems = JSON.parse(localStorage.getItem('pantryItems')) || [];
    const originalPantryItems = [...pantryItems]; // Create a copy of the original array
    // sort the pantryItems by expiry date
    pantryItems.sort((a, b) => {
        return new Date(a.expiryDate) - new Date(b.expiryDate);
    });

    // Compare if the item order changed before and after the sort
    if (JSON.stringify(pantryItems) !== JSON.stringify(originalPantryItems)) {
        // save the sorted pantryItems back to localstorage
        localStorage.setItem('pantryItems', JSON.stringify(pantryItems));
    }

    pantryList.innerHTML = '';
    pantryItems.forEach((item, index) => {
        const li = document.createElement('li');

        const daysLeft = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 3) {
            li.classList.add('expired');
        }
        if (daysLeft < 7 && daysLeft > 3) {
            li.classList.add('expiring');
        }
        // format the days left to months if it's more than 2 weeks, to years if it's more than a year
        let relativeTime = `(${daysLeft}d)`
        if (daysLeft > 14) {
            const weeksLeft = Math.floor(daysLeft / 7);
            const monthsLeft = Math.floor(daysLeft / 30);
            if (monthsLeft > 12) {
                const yearsLeft = Math.floor(monthsLeft / 12);
                relativeTime = `(${yearsLeft}y)`;
            } else if (monthsLeft >= 1) {
                relativeTime = `(${monthsLeft}m)`;
            } else {
                relativeTime = `(${weeksLeft}w)`;
            }
        }
        li.textContent = ` ${item.name} ${relativeTime}`;

        const deleteButton = document.createElement('button');
        deleteButton.textContent = "🗑";
        li.prepend(deleteButton);

        if (index === highlightIndex) {
            li.classList.add('highlight');
        }

        pantryList.appendChild(li);
    });
}

function playSound(filename) {
    const filePath = `static/${filename}.mp3`
    const audio = new Audio(filePath);
    audio.play();

}

function addPantryItem(name, expiryDate) {
    const item = {
        name,
        expiryDate
    }

    const expiryDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!expiryDateRegex.test(expiryDate)) {
        playSound('fail');
        window.setTimeout(() => {
            alert(`Expiry date format ${expiryDate} is invalid`);
        }, 500); // Delay the alert to let the sound play
        return;
    }

    const pantryItems = JSON.parse(localStorage.getItem('pantryItems')) || [];
    pantryItems.push(item);
    pantryItems.sort((a, b) => {
        return new Date(a.expiryDate) - new Date(b.expiryDate);
    });
    localStorage.setItem('pantryItems', JSON.stringify(pantryItems));
    playSound('success');
    return pantryItems.indexOf(item);
}

function removePantryItem(index) {
    const pantryItems = JSON.parse(localStorage.getItem('pantryItems')) || [];
    pantryItems.splice(index, 1);
    localStorage.setItem('pantryItems', JSON.stringify(pantryItems));
}

function parseQuickAdd(text) {
    // Match the text against the regex "<text><number>天", if match, use the number as relative date
    const relativeDateRegex = /([^\d]+)(\d+)天/;
    const relativeDateMatch = text.match(relativeDateRegex);
    if (relativeDateMatch) {
        const name = relativeDateMatch[1];
        const daysLeft = relativeDateMatch[2];
        const expiryDateObject = new Date(new Date().getTime() + daysLeft * 24 * 60 * 60 * 1000);
        const expiryDate = `${expiryDateObject.getFullYear()}-${(expiryDateObject.getMonth() + 1).toString().padStart(2, '0')}-${expiryDateObject.getDate().toString().padStart(2, '0')}`;
        return {
            name,
            expiryDate
        }
    }

    // Match the text against the regex "<text><chinese number>天", if match, use the number as relative date
    // Naive implementation, only support 1-20
    const chineseNumberRegex = /([^\d^十]+)([一二三四五六七八九十]+)天/;
    const chineseNumberMatch = text.match(chineseNumberRegex);
    if (chineseNumberMatch) {
        const name = chineseNumberMatch[1];
        const chineseNumber = chineseNumberMatch[2];
        console.log(chineseNumberMatch)
        const numberMap = {
            一: 1,
            二: 2,
            三: 3,
            四: 4,
            五: 5,
            六: 6,
            七: 7,
            八: 8,
            九: 9,
            十: 10,
            十一: 11,
            十二: 12,
            十三: 13,
            十四: 14,
            十五: 15,
            十六: 16,
            十七: 17,
            十八: 18,
            十九: 19,
            二十: 20,
        }
        const daysLeft = numberMap[chineseNumber];
        const expiryDateObject = new Date(new Date().getTime() + daysLeft * 24 * 60 * 60 * 1000);
        const expiryDate = `${expiryDateObject.getFullYear()}-${(expiryDateObject.getMonth() + 1).toString().padStart(2, '0')}-${expiryDateObject.getDate().toString().padStart(2, '0')}`;
        return {
            name,
            expiryDate
        }
    }

    // split from the first '2' from the left. Assuming this app will only be used until year 3000
    const name = text.split('2')[0];
    const expiryDateText = '2' + text.split('2').slice(1).join('2');
    const [year, month, day] = expiryDateText.split(/年|月|日|號/);
    const expiryDateObject = new Date(year, month - 1, day, 1, 0, 0, 0); // Need to be 1am to avoid timezone issues
    //format the expiry date to yyyy-mm-dd
    const expiryDate = `${expiryDateObject.getFullYear()}-${(expiryDateObject.getMonth() + 1).toString().padStart(2, '0')}-${expiryDateObject.getDate().toString().padStart(2, '0')}`;

    return {
        name,
        expiryDate
    }
}

// UI listeners
document.getElementById('quick-add').addEventListener('change', () => {
    const quickAddElement = document.getElementById('quick-add');
    const newItem = parseQuickAdd(quickAddElement.value);
    const highlightIndex = addPantryItem(newItem.name, newItem.expiryDate);
    render(highlightIndex);

    quickAddElement.value = '';
    // Focuc back to the quickAdd
    quickAddElement.focus();
});
// if the quick-add has some text, but still focused, run the change handler after idle for 2 seconds
// debounce for 3 seconds
let autoAddTimer = undefined;
const autoAddTimeout = 3000; // ms
document.getElementById('quick-add').addEventListener('input', () => {
    const quickAddElement = document.getElementById('quick-add');
    if (autoAddTimer) {
        window.clearTimeout(autoAddTimer);
    }
    if (quickAddElement.value.length > 0) {
        autoAddTimer = window.setTimeout(() => {
            quickAddElement.dispatchEvent(new Event('change'));
        }, autoAddTimeout);
    }
});

document.getElementById('name').addEventListener('change', () => {
    document.getElementById('expiry-date').focus();
});

document.getElementById('expiry-date').addEventListener('change', () => {
    const name = document.getElementById('name').value;
    const expiryDate = document.getElementById('expiry-date').value;
    const highlightIndex = addPantryItem(name, expiryDate);

    render(highlightIndex);

    document.getElementById('name').value = '';
    document.getElementById('quick-add').value = '';
    document.getElementById('expiry-date').value = '';
    // focus on the name input for smooth adding of items
    document.getElementById('name').focus();
});

pantryList.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON' && event.target.textContent === "🗑") {
        const confirmDelete = confirm('Are you sure you want to delete this item?');
        if (!confirmDelete) {
            return;
        }
        const index = Array.from(pantryList.children).indexOf(event.target.parentNode);
        removePantryItem(index);
        render();
    }
});


render();

// Export and Import
// When the export button is clicked, download the pantryItems as a json file
document.getElementById('export').addEventListener('click', () => {
    let pantryItemsJson = localStorage.getItem('pantryItems');
    const blob = new Blob([pantryItemsJson], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // set the filename to pantry-export-<date>.json
    const date = new Date().toISOString().split('T')[0];
    a.download = `pantry-export-${date}.json`;
    a.click();
});

// When the import button is clicked, open a file picker and let the user select a json file, then import it into the pantryItems and save to localstorage
document.getElementById('import').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.click();
    input.addEventListener('change', () => {
        const file = input.files[0];
        const reader = new FileReader();
        reader.readAsText(file);
        reader.addEventListener('load', () => {
            const importedPantryItems = JSON.parse(reader.result);
            // Ask if I want to overwrite the existing pantry items
            const confirmMerge = confirm('Do you want to keep existing items? Select YES to merge the imported items with the existing items, or NO to overwrite the existing items with the imported items.');
            const pantryItems = JSON.parse(localStorage.getItem('pantryItems')) || [];
            const newPantryItems = confirmMerge ? importedPantryItems.concat(pantryItems) : importedPantryItems;
            
            localStorage.setItem('pantryItems', JSON.stringify(newPantryItems));
            render();
        });
    });
});