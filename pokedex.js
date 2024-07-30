document.addEventListener('DOMContentLoaded', () => {
    const catalogueContainer = document.getElementById('catalogue');
    const loadMoreButton = document.getElementById('load-more');
    const sortPokemon = document.getElementById('sort');
    const filterPokemon = document.getElementById('filter');
    const baseURL = 'https://pokeapi.co/api/v2/pokemon';
    let offset = 0;
    const limit = 10;

    let allFetchedPokemon = [];
    let matchedPokemon = [];

    
    async function fetchCatalogue() {   
        try {
            const fetchedResponse = await fetch(`${baseURL}?limit=${limit}&offset=${offset}`);
            if (!fetchedResponse.ok) {
                throw new Error('Network response was not ok');
            }
            const fetchedData = await fetchedResponse.json();
            const pokemonPromises = fetchedData.results.map(
                pokemon => fetch(pokemon.url)
                .then(response => response.json())
            );
            const pokemonDetails = await Promise.all(pokemonPromises);
            allFetchedPokemon = allFetchedPokemon.concat(pokemonDetails);
            offset += limit;
            sortAndFilter();
        } catch (error) {
            console.error('Fetch error: ', error);
            catalogueContainer.innerHTML = 'Failed to load catalogue';
        }
    }

    function formatId(id) {
        return id.toString().padStart(3, '0');
    }

    function displayCatalogue(displayPokemon) {
        if (displayPokemon.length === 0) {
            catalogueContainer.innerHTML = '<p class="error-feedback">No results found!</p>';
            return;
        }
        catalogueContainer.innerHTML = '';
        displayPokemon.forEach(pokemon => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.pokemonId = pokemon.id;
            const img = `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${formatId(pokemon.id)}.png`;

            card.innerHTML = `
                <img src="${img}" alt="${pokemon.name}">
                <h2>${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</h2>
                <p>ID No: ${formatId(pokemon.id)}</p>
                <p>Type: ${pokemon.types.map(typeInfo => typeInfo.type.name).join(', ')}</p>
            `;

            card.addEventListener('click', () => showPopup(pokemon.id));
            catalogueContainer.appendChild(card);
        });
    }

    function sortCatalogue() {
        const criteria = sortPokemon.value;
        if (criteria === 'id-asc') {
            matchedPokemon.sort((a, b) => a.id - b.id);
        } else if (criteria === 'id-desc') {
            matchedPokemon.sort((a, b) => b.id - a.id);
        } else if (criteria === 'name-asc') {
            matchedPokemon.sort((a, b) => {
               if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
               if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
               return 0;
            });
        } else if (criteria === 'name-desc') {
            matchedPokemon.sort((a, b) => {
                if (a.name.toLowerCase() < b.name.toLowerCase()) return 1;
                if (a.name.toLowerCase() > b.name.toLowerCase()) return -1;
                return 0;
             });
        }
        displayCatalogue(matchedPokemon);
    }

    function filterCatalogue(query) {
        matchedPokemon = allFetchedPokemon.filter(pokemon => 
            pokemon.name.toLowerCase().includes(query.toLowerCase()) || 
            (formatId(pokemon.id)).toString().includes(query)
        );
        sortCatalogue();
    }

    function sortAndFilter() {
        const query = filterPokemon.value;
        filterCatalogue(query);
    }

    function formatStatName(statName) {
        switch (statName) {
            case 'hp':
                return 'HP';
            case 'special-attack':
                return 'Special Attack';
            case 'special-defense':
                return 'Special Defense';
            default:
                return statName.charAt(0).toUpperCase() + statName.slice(1);
        }
    }

    async function getWeaknesses(types) {
        const typePromises = types.map(typeInfo => fetch(typeInfo.type.url).then(response => response.json()));
        const typeDetails = await Promise.all(typePromises);
        const weaknesses = new Set();
        typeDetails.forEach(typeDetail => {
            typeDetail.damage_relations.double_damage_from.forEach(weakness => weaknesses.add(weakness.name));
        });
        return Array.from(weaknesses); 
    }

    async function showPopup(pokemonId) {
        try {
            const pokemonDetails = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
            if (!pokemonDetails.ok) {
                throw new Error('Network response was not ok');
            }
            const pokemon = await pokemonDetails.json();

            const pokemonSpecies = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}/`);
            if (!pokemonSpecies.ok) {
                throw new Error('Network response was not ok');
            }
            const speciesData = await pokemonSpecies.json();;

            const weaknesses = await getWeaknesses(pokemon.types);

            const popup = document.createElement('div');
            popup.className = 'popup';
            const popupContent = document.createElement('div');
            popupContent.className = 'popup-content';

            const statsTable = `<table class="stats-table">
                <tr><th>Stats</th><th>Value</th></tr>
                ${pokemon.stats.map(stat => `<tr><td>${formatStatName(stat.stat.name)}</td><td>${stat.base_stat}</td></tr>`).join('')}
            </table>`;

            popupContent.innerHTML = `
                <span class="close-button">&times;</span>
                <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/${formatId(pokemon.id)}.png" alt="${pokemon.name}">
                <h2>${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</h2>
                <p>ID No: ${formatId(pokemon.id)}</p>
                <p>Type: ${pokemon.types.map(typeInfo => typeInfo.type.name).join(', ')}</p>
                <p>Abilities: ${pokemon.abilities.map(abilityInfo => abilityInfo.ability.name).join(', ')}</p>
                <p>Categories: ${speciesData.egg_groups.map(categoryInfo => categoryInfo.name).join(', ')}</p>
                <p>Weaknesses: ${weaknesses.join(', ')}</p>
                <p>Height: ${pokemon.height}</p>
                <p>Weight: ${pokemon.weight}</p>
                <p><br> ${statsTable}</p>
                <br>
                <div class="navigation-buttons">
                    <button class="prev-button">Previous</button>
                    <button class="next-button">Next</button>
                </div>
            `;

            popup.appendChild(popupContent);
            document.body.appendChild(popup);

            popup.querySelector('.close-button').addEventListener('click', () => {
                document.body.removeChild(popup);
            });

            window.addEventListener('click', (out) => {
                if (out.target === popup) {
                    document.body.removeChild(popup);
                }
            });

            popup.querySelector('.prev-button').addEventListener('click', () => {
                const prevId = pokemon.id > 1 ? pokemon.id - 1 : allFetchedPokemon.length;
                document.body.removeChild(popup);
                showPopup(prevId);
            });

            popup.querySelector('.next-button').addEventListener('click', () => {
                const nextId = pokemon.id < allFetchedPokemon.length ? pokemon.id + 1 : 1;
                document.body.removeChild(popup);
                showPopup(nextId);
            });
        } catch (error) {
            console.error('Fetch error:', error);
            alert('Failed to load data');
        }
    }

    fetchCatalogue();
    sortPokemon.addEventListener('change', sortAndFilter);
    filterPokemon.addEventListener('input', sortAndFilter);
    loadMoreButton.addEventListener('click', fetchCatalogue);
});