'use strict';

const countries = document.querySelector('.countries');
const btnNav = document.querySelector('.go-down');
const section1 = document.querySelector('#section1');
const navArrow = document.querySelector('.nav-arrow');
const header = document.querySelector('#header');
const countryInfo = document.querySelector('.country-data');
const form = document.querySelector('.form');
const inputQeury = document.querySelector('.form__input');

class App {
  #map;
  #markers = [];
  #mapZoomLevel = 3;
  #countryData = {};
  #coords = [];
  #weatherData;
  #mapEvent;

  constructor() {
    // Get user's position
    this._getPosition();
    btnNav.addEventListener('click', function () {
      section1.scrollIntoView({ behavior: 'smooth' });
    });
    navArrow.addEventListener('click', function () {
      header.scrollIntoView({ behavior: 'smooth' });
    });
    this._sliderListener();
    form.addEventListener('submit', this._countryQuery.bind(this));
  }

  _sliderListener() {
    countryInfo.addEventListener('click', function (e) {
      if (e.target.closest('#slider'))
        section1.scrollIntoView({ behavior: 'smooth' });
    });
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _mapLoadAsync(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showInfo.bind(this));
  }

  _renderInfos() {
    this._renderCurrInfo();
    this._clearCountryInfoField();
    if (this.#countryData) delete this.#countryData[0];
  }

  _getDataByCode = async function (code) {
    try {
      const countryData = await this._getJSON(
        `https://countries-api-836d.onrender.com/countries/alpha/${code}`,
        'Country code is invalid. Try again!'
      );
      this.#countryData = countryData;
      this.#coords = countryData.latlng;
      this._renderInfos();
    } catch (err) {
      this._renderErr(err);
    }
  };

  _getDataByName = async function (country) {
    try {
      const [countryData] = await this._getJSON(
        `https://countries-api-836d.onrender.com/countries/name/${country}`,
        'Country name is invalid. Try again!'
      );

      this.#countryData = countryData;
      this.#coords = countryData.latlng;
      this._renderInfos();
    } catch (err) {
      this._renderErr(err);
    }
  };

  _countryQuery(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    e.preventDefault();
    const data = inputQeury.value.trim().toLowerCase();
    inputQeury.value = '';
    // country code query
    try {
      if (data.length === 2) {
        this._getDataByCode.call(this, data);
      }
      // country name query
      if (!data.includes(',') && data.length > 2) {
        const nameCountry = data[0].toUpperCase() + data.slice(1);
        this._getDataByName.call(this, nameCountry);
      }
      // coordinates query
      if (Number.isFinite(+data[0])) {
        const coords = data.split(',').map(num => +num.trim());
        if (!validInputs(...coords))
          throw new Error(
            "Check your input. It can't be validate correctly ...."
          );
        if (validInputs(...coords)) {
          this.#coords = coords;
          this._getCountryData(...coords);
        }
      }
    } catch (err) {
      this._renderErr(err);
    }
  }

  _clearMarkers() {
    if (this.#markers.length) {
      this.#map.removeLayer(this.#markers[0]);
      this.#markers.splice(0, 1);
    }
  }

  _clearCountryInfoField() {
    if (document.querySelectorAll('.country-info'))
      document.querySelectorAll('.country-info').forEach(e => e.remove());
  }

  _clearCountryField() {
    if (document.querySelector('.country')) {
      document.querySelector('.country').remove();
      countries.style.opacity = 0;
    }
  }

  _loadErrorInfo = function (err) {
    this._clearCountryInfoField();
    const html = `
    <h3 class="country-info">${err.message.slice(0, -3)}</h3>`;
    countryInfo.insertAdjacentHTML('afterbegin', html);
  };

  _loadInfo() {
    const data = this.#countryData;
    const html = `
    <h3 class="country-info">You are in ${
      data.name
    } <img class="country__info__img" src="${this.#countryData.flag}" />, ${
      data.region
    }.</h3>
    <h3 class="country-info margin-sm">${(+data.population / 1000000).toFixed(
      1
    )} million people live in there.</h3>
    <h3 class="country-info margin-md";>Currency is ${
      data.currencies[0].name
    }.</h3>
    <h3 class="country-info margin-lg";>Citizens speak ${
      data.languages[0].name
    }.</h3>
    <h3 class="country-info cursor-p" id="slider" >Check local time & weather below <span class="hand-click">⤵️</span></h3>
    `;
    countryInfo.insertAdjacentHTML('afterbegin', html);
  }

  _loadMap(position) {
    (async function () {
      await this._mapLoadAsync(position);
      const { latitude: lat, longitude: lng } = position.coords;
      this.#coords = [lat, lng];
      await this._getCountryData(...this.#coords);
    }).call(this);
  }

  _getJSON = function (url, errorMsg = 'Something went wrong...') {
    return fetch(url).then(response => {
      if (!response.ok) throw new Error(`${errorMsg}${response.status}`);

      return response.json();
    });
  };

  _renderErr = function (err) {
    this._clearCountryField();
    const html = `
      <article class="country">
        <div class="country__data">
        <h3 class="country__name">
        Error    🤖</h3>
        <h4 class="country__region">${err.message.slice(0, -3)}</h4>
        </br>
        <h4 class="country__region">Try again!</h4>
        
        </div>
      </article>
      `;
    countries.insertAdjacentHTML('afterbegin', html);
    countries.style.opacity = 1;
    this._clearMarkers();
    this._loadErrorInfo(err);
  };

  _getCountryData = async function (lat, lng) {
    try {
      const geoData = await this._getJSON(
        `
        https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&format=json&apiKey=03622f340f754f8dabe96c41591b6149`
      );

      if (!geoData.results.length)
        throw new Error('Connection error (refresh the page)!!!!');
      const countryData = await this._getJSON(
        `https://countries-api-836d.onrender.com/countries/alpha/${geoData.results[0].country_code}`,
        'There is no country at this territory!'
      );
      this.#countryData = countryData;
      this._renderCurrInfo();
      this._clearCountryInfoField();
      if (this.#countryData) delete this.#countryData[0];
    } catch (err) {
      this._renderErr(err);
    }
  };

  _getWeatherData = async function (lat, lng) {
    const weatherData = await this._getJSON(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=2dfa6f845beab2346b8c0ccea8e5d024`
    );
    this.#weatherData = weatherData;
    this._loadInfo();
    await this._renderWeatherData(this.#weatherData);
  };

  _showInfo(mapE) {
    this.#mapEvent = mapE;
    const { lat, lng } = mapE.latlng;
    this.#coords = [];
    this.#coords = [lat, lng];
    this._getCountryData(lat, lng);
  }

  _renderCurrPopup(coords) {
    const marker = L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 100,
          minWidth: 100,
          // autoClose: false,
          closeOnClick: false,
          // className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `<img class="country__img" style="width:10rem; height: 4.5rem" src="${
          this.#countryData.flag
        }" />`
      )
      .openPopup();
    this.#markers.push(marker);
  }

  _getLocalTime(sec) {
    const date = new Date();
    date.setTime(
      date.getTime() + (sec * 1000 + date.getTimezoneOffset() * 60 * 1000)
    );
    return [
      `${date.getHours()}:${date.getMinutes()}`,
      `UTC    ${sec < 0 ? '-' : '+'}${Math.abs(sec / 3600)}h`,
    ];
  }

  _renderWeatherData(weatherData) {
    const imgUrl = `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`;
    const description =
      weatherData.weather[0].description[0].toUpperCase() +
      weatherData.weather[0].description.slice(1);
    const localTime = this._getLocalTime(weatherData.timezone);

    const html = `
    <h4 class="weather">Weather info:</h4>
    <p class="country__row"><span>🌡️</span>${(
      +weatherData.main.temp - 273.15
    ).toFixed()}℃</p>
    <p class="country__row"><span>🌄</span>${description}</p>
    <p class="country__row"><span>🍃</span>${+weatherData.wind.speed.toFixed()} m/sec</p>
    <h4 class="weather">Local time:</h4>
    <p class="country__row"><span>⌚</span>${localTime[0]}</p>
    <p class="country__row"><span>⏳</span>${localTime[1]}</p>
    </div>`;
    document
      .querySelector('.country__data')
      .insertAdjacentHTML('beforeend', html);
  }

  _renderCurrInfo() {
    this._clearMarkers();
    this._clearCountryField();
    const data = this.#countryData;
    this._renderCurrPopup(this.#coords);
    const html = `
    <article class="country">
      <img class="country__img" src="${data.flag}" />
      <div class="country__data">
      <h3 class="country__name">${data.name}</h3>
      <h4 class="country__region">${data.region}</h4>
      <p class="country__row"><span>🌇</span>${data.capital}</p>
      <p class="country__row"><span>👫</span>${(
        +data.population / 1000000
      ).toFixed(1)} people</p>
      <p class="country__row"><span>🗣️</span>${data.languages[0].name}</p>
      <p class="country__row"><span>💰</span>${data.currencies[0].name}</p>
      </div>
    </article>
    `;
    countries.insertAdjacentHTML('afterbegin', html);
    countries.style.opacity = 1;
    this._getWeatherData(...this.#coords);
  }
}

const app = new App();
