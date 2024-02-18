const showButton = document.getElementById('showButton');
const textInput = document.getElementById('textInput');
const textContainer = document.getElementById('textContainer');


const setsSelect = document.getElementById('setsSelect');
const filterInput = document.getElementById('filterInput');
const cardInfoContainer = document.getElementById('cardInfoContainer');

const budget = 100;

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
showButton.addEventListener('click', async function() {
    const text = textInput.value;

    if (!text) {
        alert('Please enter some text to display.');
        return;
    }
    try {
        let selectedSets = Array.from(setsSelect.selectedOptions).map(x => x.value);
        let deck_price = 0;                                             
        let deck = parseYdkeUrl(text);
        for (const cardId of deck.main) {
            //console.log("Getting info of card: ", cardId)
            const cardInfo = (await getCardInfo(cardId)).data[0];
            console.log(JSON.stringify(cardInfo));
            console.log(cardInfo.name, cardInfo.id);
            let matched_set = null;
            for (const card_set of cardInfo.card_sets) {
               // console.log("Finding ", card_set.set_name , " in ", selectedSets)
                if (selectedSets.includes(card_set.set_name)) {
                    if (!matched_set) matched_set = card_set;
                    else {
                        if (prices[matched_set.set_rarity_code] < prices[card_set.set_rarity_code]) matched_set = card_set;
                    }
                }
            }
            if (!matched_set) throw "INVALID: Card: " + cardInfo.name + " not found in selected sets."
            console.log(" Card: " , cardInfo.name , " found in: ", matched_set);
            deck_price += prices[matched_set.set_rarity_code];
        }
        if (deck_price > budget) throw "INVALID: Deck price $" + deck_price + " exceding budget of $" + budget;
        textContainer.textContent = "VALID: Deck price $" + deck_price;

    } catch (err) {
        textContainer.textContent = err;
    }

});
