const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const loadingSpinner = document.getElementById("loadingSpinner");
const themeToggle = document.getElementById("themeToggle");
const locationBtn = document.getElementById("locationBtn");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveApiKeyBtn = document.getElementById("saveApiKeyBtn");

const cityName = document.getElementById("cityName");
const temperature = document.getElementById("temperature");
const condition = document.getElementById("condition");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const feelsLike = document.getElementById("feelsLike");
const sunTime = document.getElementById("sunTime");
const weatherIcon = document.getElementById("weatherIcon");
const forecastList = document.getElementById("forecastList");
const hourlyList = document.getElementById("hourlyList");
const historyList = document.getElementById("historyList");
const predictionSummary = document.getElementById("predictionSummary");
const predictionCards = document.querySelectorAll(".prediction-card");

function getApiKey() {
    const defaultKey = "96b2aa65ba39f9f049444129aec6c0a6";
    const stored = localStorage.getItem("weatherApiKey") || defaultKey;
    localStorage.setItem("weatherApiKey", stored);
    apiKeyInput.value = stored;
    return stored.trim();
}

function saveApiKey() {
    const key = apiKeyInput.value.trim();

    if (!key) {
        alert("Please enter your OpenWeather API key first.");
        return false;
    }

    localStorage.setItem("weatherApiKey", key);
    alert("API key saved successfully.");
    return true;
}

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-theme", isDark);
    themeToggle.textContent = isDark ? "☀️ Light" : "🌙 Dark";
}

function applyWeatherBackground(conditionText = "") {
    const text = conditionText.toLowerCase();
    const weatherClassMap = [
        { match: ["thunderstorm", "storm"], className: "weather-storm" },
        { match: ["rain", "drizzle", "shower"], className: "weather-rain" },
        { match: ["snow", "sleet", "hail"], className: "weather-snow" },
        { match: ["cloud", "mist", "fog", "haze"], className: "weather-clouds" },
        { match: ["clear", "sunny"], className: "weather-clear" }
    ];

    const matchedClass = weatherClassMap.find((item) =>
        item.match.some((keyword) => text.includes(keyword))
    );

    ["weather-clear", "weather-clouds", "weather-rain", "weather-storm", "weather-snow"].forEach((className) => {
        document.body.classList.remove(className);
    });

    if (matchedClass) {
        document.body.classList.add(matchedClass.className);
    } else {
        document.body.classList.add("weather-clear");
    }
}

function setLoadingState(isLoading) {
    loadingSpinner.classList.toggle("hidden", !isLoading);
    searchBtn.disabled = isLoading;
    searchBtn.textContent = isLoading ? "Loading..." : "Search";
}

function updateSkyPrediction(conditionText = "") {
    const text = conditionText.toLowerCase();
    let prediction = { key: "clear", label: "Clear and bright" };

    if (text.includes("thunder") || text.includes("storm")) {
        prediction = { key: "storm", label: "Stormy sky ahead" };
    } else if (text.includes("rain") || text.includes("drizzle") || text.includes("shower")) {
        prediction = { key: "rain", label: "Rainy outlook" };
    } else if (text.includes("snow") || text.includes("sleet") || text.includes("hail")) {
        prediction = { key: "rain", label: "Cold and wintry" };
    } else if (text.includes("cloud") || text.includes("mist") || text.includes("fog") || text.includes("haze")) {
        prediction = { key: "clouds", label: "Cloudy and calm" };
    }

    predictionSummary.textContent = prediction.label;

    predictionCards.forEach((card) => {
        card.classList.toggle("active", card.dataset.sky === prediction.key);
    });
}

saveApiKeyBtn.addEventListener("click", saveApiKey);
searchBtn.addEventListener("click", getWeather);
locationBtn.addEventListener("click", getWeatherByLocation);

cityInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        getWeather();
    }
});

const savedTheme = localStorage.getItem("weatherTheme") || "light";
applyTheme(savedTheme);
renderHistory();

themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
    localStorage.setItem("weatherTheme", nextTheme);
    applyTheme(nextTheme);
});

cityInput.value = "New York";
getWeather();

async function getWeatherByLocation() {
    const apiKey = getApiKey();

    if (!apiKey) {
        alert("Please save a valid OpenWeather API key before using live weather data.");
        return;
    }

    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    setLoadingState(true);
    cityName.textContent = "Locating...";
    temperature.textContent = "--°C";
    condition.textContent = "Getting your location...";
    humidity.textContent = "Humidity: --%";
    wind.textContent = "Wind Speed: -- km/h";
    feelsLike.textContent = "--°C";
    sunTime.textContent = "--:-- / --:--";
    weatherIcon.src = "https://openweathermap.org/img/wn/01d@2x.png";
    weatherIcon.alt = "Location weather";

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;

            try {
                const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

                const [weatherResponse, forecastResponse] = await Promise.all([
                    fetch(weatherUrl),
                    fetch(forecastUrl)
                ]);

                const weatherData = await weatherResponse.json();
                const forecastData = await forecastResponse.json();

                if (!weatherResponse.ok) {
                    throw new Error(weatherData.message || "Unable to fetch weather for your location.");
                }

                if (!forecastResponse.ok) {
                    throw new Error(forecastData.message || "Unable to fetch forecast for your location.");
                }

                renderWeather(weatherData);
                renderForecast(forecastData.list || []);
            } catch (error) {
                console.error("Location Weather Error:", error);
                showError(error.message);
            } finally {
                setLoadingState(false);
            }
        },
        (error) => {
            setLoadingState(false);
            const message = error.code === 1
                ? "Location access was denied. Please search for a city manually."
                : "Unable to get your location right now. Please try again or search for a city.";
            showError(message);
            alert(message);
        }
    );
}

function renderWeather(data) {
    cityName.textContent = data.name;
    temperature.textContent = `${Math.round(data.main.temp)}°C`;
    condition.textContent = data.weather[0].description;
    humidity.textContent = `Humidity: ${data.main.humidity}%`;
    feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;

    const windKmh = data.wind.speed * 3.6;
    wind.textContent = `Wind Speed: ${Math.round(windKmh)} km/h`;

    const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    sunTime.textContent = `${sunrise} / ${sunset}`;

    const iconCode = data.weather[0].icon;
    weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    weatherIcon.alt = data.weather[0].description;

    applyWeatherBackground(data.weather[0].main || data.weather[0].description);
    updateSkyPrediction(data.weather[0].description || data.weather[0].main || "clear");
}

function getHistory() {
    const saved = localStorage.getItem("weatherHistory");
    return saved ? JSON.parse(saved) : [];
}

function saveHistory(cityName) {
    const cleanName = cityName.trim();
    if (!cleanName) return;

    const history = getHistory();
    const nextHistory = [cleanName, ...history.filter((item) => item.toLowerCase() !== cleanName.toLowerCase())].slice(0, 5);
    localStorage.setItem("weatherHistory", JSON.stringify(nextHistory));
    renderHistory();
}

function renderHistory() {
    const history = getHistory();
    if (!history.length) {
        historyList.innerHTML = "<span class='history-item'>No recent searches</span>";
        return;
    }

    historyList.innerHTML = history.map((city) => `
        <button class="history-item" type="button" data-city="${city}">${city}</button>
    `).join("");

    historyList.querySelectorAll(".history-item").forEach((button) => {
        button.addEventListener("click", () => {
            cityInput.value = button.dataset.city;
            getWeather();
        });
    });
}

function renderHourlyForecast(items) {
    const hourly = items.slice(0, 6);

    hourlyList.innerHTML = hourly.map((item) => {
        const time = new Date(item.dt * 1000).toLocaleTimeString([], { hour: "numeric" });
        const temp = Math.round(item.main.temp);
        const icon = item.weather[0].icon;
        const desc = item.weather[0].description;

        return `
            <div class="hourly-card">
                <span class="hourly-time">${time}</span>
                <img class="hourly-icon" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" />
                <strong>${temp}°C</strong>
                <small>${desc}</small>
            </div>
        `;
    }).join("");
}

function renderForecast(items) {
    const dailyForecast = items
        .filter((item) => item.dt_txt.includes("12:00:00"))
        .slice(0, 5);

    if (!dailyForecast.length) {
        forecastList.innerHTML = "<div class='forecast-card'><small>No forecast available</small></div>";
        return;
    }

    forecastList.innerHTML = dailyForecast.map((item) => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString("en-US", { weekday: "short" });
        const temp = Math.round(item.main.temp);
        const icon = item.weather[0].icon;
        const desc = item.weather[0].description;

        return `
            <div class="forecast-card">
                <span class="forecast-day">${day}</span>
                <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" />
                <strong>${temp}°C</strong>
                <small>${desc}</small>
            </div>
        `;
    }).join("");
}

function showError(message) {
    cityName.textContent = "Error";
    temperature.textContent = "--°C";
    condition.textContent = message;
    humidity.textContent = "Humidity: --%";
    wind.textContent = "Wind Speed: -- km/h";
    feelsLike.textContent = "--°C";
    sunTime.textContent = "--:-- / --:--";
    weatherIcon.src = "https://openweathermap.org/img/wn/04d@2x.png";
    weatherIcon.alt = "Error icon";
    applyWeatherBackground("clear");
    updateSkyPrediction("clear");
}

async function getWeather() {
    const apiKey = getApiKey();
    const city = cityInput.value.trim();

    if (!apiKey) {
        alert("Please save a valid OpenWeather API key before fetching weather.");
        return;
    }

    if (city === "") {
        alert("Please enter a city name");
        return;
    }

    setLoadingState(true);
    cityName.textContent = "Loading...";
    temperature.textContent = "--°C";
    condition.textContent = "Getting weather...";
    humidity.textContent = "Humidity: --%";
    wind.textContent = "Wind Speed: -- km/h";
    feelsLike.textContent = "--°C";
    sunTime.textContent = "--:-- / --:--";
    weatherIcon.src = "https://openweathermap.org/img/wn/01d@2x.png";
    weatherIcon.alt = "Loading weather";

    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();

        if (!weatherResponse.ok) {
            if (weatherResponse.status === 401) {
                throw new Error("Invalid API key. Please add your OpenWeather API key.");
            }

            if (weatherResponse.status === 404) {
                throw new Error("City not found. Please try another city.");
            }

            throw new Error(weatherData.message || "Something went wrong while fetching weather data.");
        }

        if (!forecastResponse.ok) {
            throw new Error(forecastData.message || "Something went wrong while fetching the forecast.");
        }

        saveHistory(city);
        renderWeather(weatherData);
        renderHourlyForecast(forecastData.list || []);
        renderForecast(forecastData.list || []);
    } catch (error) {
        console.error("Weather Error:", error);
        showError(error.message);
        alert(error.message);
    } finally {
        setLoadingState(false);
    }
}
