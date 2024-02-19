const validateButton = document.getElementById('validateButton');
const importButton = document.getElementById('importButton');
const exportButton = document.getElementById('exportButton');
const textInput = document.getElementById('textInput');
const textContainer = document.getElementById('textContainer');


const setsSelect = document.getElementById('setsSelect');
let allCards = {};
let avalableCards = {};
const extraTypes = ["Fusion Monster", "Synchro Monster", "XYZ Monster"]
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
    let availableCards = []

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
        if (in_set) availableCards.push(allCards[id]);
    }
    availableCards.sort(function (x, y) {
        if (x.name < y.name) return -1;
        return 1;
    });
    const availableContainer = document.getElementById("availableContainer");
    availableContainer.innerHTML = ""
    const headerRow = document.createElement("tr");
    const addHeader = document.createElement("th");
    addHeader.textContent = "Add";
    headerRow.appendChild(addHeader);
    const elementHeader = document.createElement("th");
    elementHeader.textContent = "Card name";
    headerRow.appendChild(elementHeader);
    const priceHeader = document.createElement("th");
    priceHeader.textContent = "Price"
    headerRow.appendChild(priceHeader)
    const typeHeader = document.createElement("th");
    typeHeader.textContent = "Type"
    headerRow.appendChild(typeHeader);
    availableContainer.appendChild(headerRow);


    for (const card of availableCards) {
        const row = document.createElement("tr");

        // Delete button cell
        const addCell = document.createElement("td");
        const addButton = document.createElement("button");
        addButton.textContent = "A";
        addButton.addEventListener("click", () => {
            // Update remaining elements to reflect updated array
            addCard(card, false);
            populateDeckTable();
        });
        addCell.appendChild(addButton);
        row.appendChild(addCell);

        // Element cell
        const elementCell = document.createElement("td");
        elementCell.innerHTML = "<a href=\"" + card.ygoprodeck_url + "\"    target=\"_blank\">" + card.name + "</a>";
        row.appendChild(elementCell);

        const priceCell = document.createElement("td");
        const matched_set = findSet(card);
        priceCell.textContent = matched_set.set_rarity_code + " - " + prices[matched_set.set_rarity_code];
        row.appendChild(priceCell)

        const typeCell = document.createElement("td");
        typeCell.textContent = card.type;
        row.appendChild(typeCell);
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
    if (!deck.side) deck.side = [];
    if (!deck.main) deck.main = [];
    if (!deck.extra) deck.extra = [];
    for (const cardInfo of deck.main) {
        //console.log("Getting info of card: ", cardId)
        if (deck.main.filter(el => el.id === cardInfo.id).length + deck.extra.filter(el => el.id === cardInfo.id).length + deck.side.filter(el => el.id === cardInfo.id).length > 3) throw "INVALID: More than 3 cards of " + cardInfo.name;
        console.log(JSON.stringify(cardInfo));
        console.log(cardInfo.name, cardInfo.id);
        let matched_set = findSet(cardInfo);
        deck_price += prices[matched_set.set_rarity_code];
    }
    for (const cardInfo of deck.extra) {
        //console.log("Getting info of card: ", cardId)
        if (deck.main.filter(el => el.id === cardInfo.id).length + deck.extra.filter(el => el.id === cardInfo.id).length + deck.side.filter(el => el.id === cardInfo.id).length > 3) throw "INVALID: More than 3 cards of " + cardInfo.name;
        console.log(JSON.stringify(cardInfo));
        console.log(cardInfo.name, cardInfo.id);
        let matched_set = findSet(cardInfo);
        deck_price += prices[matched_set.set_rarity_code];
    }
    for (const cardInfo of deck.side) {
        //console.log("Getting info of card: ", cardId)
        if (deck.main.filter(el => el.id === cardInfo.id).length + deck.extra.filter(el => el.id === cardInfo.id).length + deck.side.filter(el => el.id === cardInfo.id).length > 3) throw "INVALID: More than 3 cards of " + cardInfo.name;
        console.log(JSON.stringify(cardInfo));
        console.log(cardInfo.name, cardInfo.id);
        let matched_set = findSet(cardInfo);
        deck_price += prices[matched_set.set_rarity_code];
    }
    if (deck_price > budget) throw "INVALID: Deck price $" + deck_price + " exceding budget of $" + budget;
    textContainer.textContent = "VALID: Deck price $" + deck_price;
};
function addCard(card, is_side) {
    if (is_side) {
        deck.side.push(card);
    } else {
        if (extraTypes.includes(card.type)) deck.extra.push(card)
        else deck.main.push(card);
    }
}
function BuildTable(subdeck, title, is_side) {
    console.log(deck ,title)
    let price = 0; 
    const divTable = document.createElement("div");
    const info = document.createElement("div");
   // info.innerHTML = "<p>Number of cards: " + subdeck.length + " </p><p>price: " + price + "</p>";
    info.innerHTML = title;

    divTable.appendChild(info)
    const headerRow = document.createElement("tr");
    const deleteHeader = document.createElement("th");
    deleteHeader.textContent = "Delete";
    headerRow.appendChild(deleteHeader);
    const moveHeader = document.createElement("th");
    moveHeader.textContent = "Move";
    headerRow.appendChild(moveHeader);
    const elementHeader = document.createElement("th");
    elementHeader.textContent = "Card name";
    headerRow.appendChild(elementHeader);
    const rarirtyHeader = document.createElement("th");
    rarirtyHeader.textContent = "Rarity";
    headerRow.appendChild(rarirtyHeader);
    const priceHeader = document.createElement("th");
    priceHeader.textContent = "Price";
    headerRow.appendChild(priceHeader);
    divTable.appendChild(headerRow);

    for (const card of subdeck) {
        const row = document.createElement("tr");

        // Delete button cell
        const deleteCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.style = "background-color: #ae2626;"
        deleteButton.addEventListener("click", () => {
            // Update remaining elements to reflect updated array
            subdeck.splice(subdeck.indexOf(card), 1);
            populateDeckTable();
        });
        deleteCell.appendChild(deleteButton);
        row.appendChild(deleteCell);

        const moveCell = document.createElement("td");
        const moveButton = document.createElement("button");  
        moveButton.textContent = is_side ? "To main" : "To side";
        moveButton.style = "background-color: #00cc00;"
        moveButton.addEventListener("click", () => {
            // Update remaining elements to reflect updated array
            subdeck.splice(subdeck.indexOf(card), 1);
            addCard(card, !is_side);
            populateDeckTable();
        });
        moveCell.appendChild(moveButton);
        row.appendChild(moveCell);        
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
        divTable.appendChild(row);
    }
    return {price, divTable};
}

function populateDeckTable() {
    if (!deck.side) deck.side = [];
    if (!deck.main) deck.main = [];
    if (!deck.extra) deck.extra = [];
    deck.main.sort(function (x, y) {
        if (x.name < y.name) return -1;
        return 1;
    });
    deck.extra.sort(function (x, y) {
        if (x.name < y.name) return -1;
        return 1;
    });
    deck.side.sort(function (x, y) {
        if (x.name < y.name) return -1;
        return 1;
    });
    const listContainer = document.getElementById("listContainer");
    listContainer.innerHTML = "";
    const main_table =  BuildTable(deck.main, "Main Deck", false)
    const extra_table = BuildTable(deck.extra, "Extra Deck", false)
    const side_table = BuildTable(deck.side, "Side Deck", true)
    listContainer.appendChild(main_table.divTable);
    listContainer.appendChild(extra_table.divTable);
    listContainer.appendChild(side_table.divTable);
 
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
        deck.extra = []
        deck.side = []
       for (let id of parsed_deck.main) {
            if (allCards[id]) deck.main.push(allCards[id])
            else throw "INVALID: Card " + id + " not found in ygopro database";
        } 
        for (let id of parsed_deck.extra) {
            if (allCards[id]) deck.extra.push(allCards[id])
            else throw "INVALID: Card " + id + " not found in ygopro database";
        } 
        for (let id of parsed_deck.side) {
            if (allCards[id]) deck.side.push(allCards[id])
            else throw "INVALID: Card " + id + " not found in ygopro database";
        } 
        populateDeckTable();

    } catch (err) {
        console.log(err);
        textContainer.textContent = err;
    }
}
);
validateButton.addEventListener('click', async function () {

    try {
        await validateDeck(deck);
    } catch (err) {
        textContainer.textContent = err;
    }
});
exportButton.addEventListener('click', async function () {
    try {
        navigator.clipboard.writeText(toYdkeURL());
        alert("Ydke copied to clipboard");
    } catch (err) {
        alert(err);
    }
})