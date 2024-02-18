const validateButton = document.getElementById('validateButton');
const importButton = document.getElementById('importButton');
const exportButton = document.getElementById('exportButton');
const textInput = document.getElementById('textInput');
const textContainer = document.getElementById('textContainer');


const setsSelect = document.getElementById('setsSelect');
let allCards = {};
let avalableCards = {};
const budget = 100;
let deck = {
    main: []
}
const prices =
{
    "(C)": 1,
    "(R)": 3,
    "(SP)": 3,
    "(SSP)": 3,
    "(SR)": 5,
    "(UR)": 7,
    "(ScR)": 7,
};


function populateSetOptions(setNames) {

    setsSelect.innerHTML = '';
    for (const name of setNames) {
        const option = document.createElement('option');

        option.value = name;
        option.text = name;
        setsSelect.add(option)
    }
    MultiSelectDropdown(window.MultiSelectDropdownOptions)

}

// Initialize options
fetch("https://db.ygoprodeck.com/api/v7/cardsets.php")
    .then(response => response.json())
    .then(data => populateSetOptions(data.map((x) => x.set_name)))
    .catch(error => {
        console.error('Error fetching API data:', error);
        alert("Cannot get sets data from ygoprodeck")
    });
// Initialize options
fetch("https://db.ygoprodeck.com/api/v7/cardinfo.php")
    .then(response => response.json())
    .then(data => {
        console.log("Feteched info of : ", data.data.length, " cards");
        for (const card of data.data) {
            allCards[card.id] = card;
        }
    })
    .catch(error => {
        console.error('Error fetching API data:', error);
        alert("Cannot get cards form ygoprodeck")
    });


function base64ToUint32Array(base64) {
    // 1. Decode the base64 string into an array of bytes:
    const bytes = atob(base64);

    // 2. Create a typed array (Uint8Array) from the decoded bytes:
    const typedArray = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        typedArray[i] = bytes.charCodeAt(i);
    }

    // 3. Create a view on the typed array as a Uint32Array:
    return new Uint32Array(typedArray.buffer);
}

function parseYdkeUrl(ydke) {
    if (!ydke.startsWith("ydke://")) {
        throw new Error("Unrecognized URL protocol");
    }
    const components = ydke.slice("ydke://".length).split("!");
    if (components.length < 3) {
        throw new Error("Missing ydke URL component");
    }
    return {
        main: base64ToUint32Array(components[0]),
        extra: base64ToUint32Array(components[1]),
        side: base64ToUint32Array(components[2])
    };
}

function passcodesToBase64(list_id) {
  const passcodes = new Uint32Array(list_id);
  // Create a typed array view of the Uint32Array as Uint8Array
  const uint8View = new Uint8Array(passcodes.buffer);

  // Create a data string using a temporary array and join
  const dataString = Array.from(uint8View).map(byte => String.fromCharCode(byte)).join("");

  // Encode the data string to Base64 using btoa
  return btoa(dataString);
}

function toYdkeURL() {
    let compresedDeck = {}
    
        compresedDeck.main = deck.main ? deck.main.map(el => el.id) : [];
    
        compresedDeck.extra = deck.extra ? deck.extra.map(el => el.id) : [];
        compresedDeck.side = deck.side ? deck.side.map(el => el.id) : [];
    return "ydke://" +
        passcodesToBase64(compresedDeck.main) + "!" +
        passcodesToBase64(compresedDeck.extra) + "!" +
        passcodesToBase64(compresedDeck.side) + "!";
}

async function getCardInfo(cardId) {
    try {
        const response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${cardId}`);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching card info:', error);
        throw error; // Re-throw for handling in getCardInfo
    }
}

async function getListCards(set_name) {
    try {
        const response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=${set_name}`);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching card info:', error);
        throw error; // Re-throw for handling in getCardInfo
    }
}


setsSelect.onchange = async function () {

    let selectedSets = Array.from(setsSelect.selectedOptions).map(x => x.value);
    console.log("Sets selected: ", selectedSets)
    avalableCards = {};
    for (const id in allCards) {    
        let in_set = false;
        card = allCards[id];
        if (!card.card_sets || !Array.isArray(card.card_sets)) {
            continue;
        }
        for (const card_set of card.card_sets) {
            if (selectedSets.includes(card_set.set_name)) {  
                in_set = true;
            }
        }
        // console.log("Finding ", card_set.set_name , " in ", selectedSets)
        if (in_set) avalableCards[id] = allCards[id];
    }
    const availableContainer = document.getElementById("availableContainer");
    availableContainer.innerHTML = ""
    const headerRow = document.createElement("tr");
    const addHeader = document.createElement("th");
    addHeader.textContent = "Add";
    headerRow.appendChild(addHeader);
    const elementHeader = document.createElement("th");
    elementHeader.textContent = "Card name";
    headerRow.appendChild(elementHeader);
    availableContainer.appendChild(headerRow);

    for (const cardId in avalableCards)  {
        const card = avalableCards[cardId];
        const row = document.createElement("tr");

        // Delete button cell
        const addCell = document.createElement("td");
        const addButton = document.createElement("button");
        addButton.textContent = "Add";
        addButton.addEventListener("click", () => {
            // Update remaining elements to reflect updated array
            deck.main.push(card);
            populateDeckTable(deck.main);
        });
        addCell.appendChild(addButton);
        row.appendChild(addCell);

        // Element cell
        const elementCell = document.createElement("td");
        elementCell.textContent = card.name;
        row.appendChild(elementCell);

        availableContainer.appendChild(row);
    }

}

function findSet(card) {
    let selectedSets = Array.from(setsSelect.selectedOptions).map(x => x.value);
    let matched_set = null;
    for (const card_set of card.card_sets) {
        // console.log("Finding ", card_set.set_name , " in ", selectedSets)
        if (selectedSets.includes(card_set.set_name)) {
            if (!matched_set) matched_set = card_set;
            else {
                if (prices[matched_set.set_rarity_code] < prices[card_set.set_rarity_code]) matched_set = card_set;
            }
        }
    }
    if (!matched_set) throw "INVALID: Card: " + card.name + " not found in selected sets."
    console.log(" Card: ", card.name, " found in: ", matched_set);
    return matched_set;
}
async function validateDeck(deck) {
    let deck_price = 0;
    for (const cardInfo of deck) {
        //console.log("Getting info of card: ", cardId)
        if (deck.filter(el => el.id === cardInfo.id).length > 3) throw "INVALID: More than 3 cards of " + cardInfo.name;
        console.log(JSON.stringify(cardInfo));
        console.log(cardInfo.name, cardInfo.id);
        let matched_set = findSet(cardInfo);
        deck_price += prices[matched_set.set_rarity_code];
    }
    if (deck_price > budget) throw "INVALID: Deck price $" + deck_price + " exceding budget of $" + budget;
    textContainer.textContent = "VALID: Deck price $" + deck_price;
};


function populateDeckTable(list_cards) {
    list_cards = list_cards.sort(function(x, y) {
        if (x.name < y.name) return -1;
        return 1;
    });
    const listContainer = document.getElementById("listContainer");
    listContainer.innerHTML = "";
    let price = 0;
    const info = document.createElement("div");
    info.innerHTML = "<p>Number of cards: " + list_cards.length + " </p><p>price: " + price + "</p>";
    listContainer.appendChild(info) 
    const headerRow = document.createElement("tr");
    const deleteHeader = document.createElement("th");
    deleteHeader.textContent = "Delete";
    headerRow.appendChild(deleteHeader);
    const elementHeader = document.createElement("th");
    elementHeader.textContent = "Card name";
    headerRow.appendChild(elementHeader);
    const rarirtyHeader = document.createElement("th");
    rarirtyHeader.textContent = "Rarity";
    headerRow.appendChild(rarirtyHeader);
    const priceHeader = document.createElement("th");
    priceHeader.textContent = "Price";
    headerRow.appendChild(priceHeader);
    listContainer.appendChild(headerRow);

    for (const card of list_cards) {
        const row = document.createElement("tr");

        // Delete button cell
        const deleteCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Remove";
        deleteButton.addEventListener("click", () => {
            // Update remaining elements to reflect updated array
            list_cards.splice(list_cards.indexOf(card), 1);
            populateDeckTable(list_cards);
        });
        deleteCell.appendChild(deleteButton);
        row.appendChild(deleteCell);

        // Element cell
        const elementCell = document.createElement("td");
        elementCell.textContent = card.name;
        row.appendChild(elementCell);

        let matched_set = findSet(card);
        // ID cell
        const rarityCell = document.createElement("td");
        rarityCell.textContent = matched_set.set_rarity_code; // Assign and display unique ID
        row.appendChild(rarityCell);

        // Price
        const priceCell = document.createElement("td");
        priceCell.textContent = prices[matched_set.set_rarity_code];
        row.appendChild(priceCell);
        price += prices[matched_set.set_rarity_code];
        info.innerHTML = "<p>Number of cards: " + list_cards.length + "</p><p>price: " + price + "</p>";
        
        listContainer.appendChild(row);
    }
};


importButton.addEventListener('click', async function () {
    const text = textInput.value;

    if (!text) {
        alert('Please enter some text to display.');
        return;
    }
    try {
        parsed_deck = parseYdkeUrl(text);
        deck.main = []
        for (let id of parsed_deck.main) {
            if (allCards[id]) deck.main.push(allCards[id])
            else throw "INVALID: Card " + id + " not found in ygopro database";
        }
        populateDeckTable(deck.main);

    } catch (err) {
        console.log(err);
        textContainer.textContent = err;
    }
}
);
validateButton.addEventListener('click', async function () {

    try {
        await validateDeck(deck.main);
    } catch (err) {
        textContainer.textContent = err;
    }
});
exportButton.addEventListener('click', async function() {
    try {
        navigator.clipboard.writeText(toYdkeURL());
        alert("Ydke copied to clipboard");
    } catch(err) {
        alert(err);
    }
})