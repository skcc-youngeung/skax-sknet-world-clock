document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const clockFace = document.getElementById('clock-face');
    const digitalTimeEl = document.getElementById('current-time-digital');
    const amPmEl = document.getElementById('am-pm');
    const localCityNameEl = document.getElementById('local-city-name');
    const localCityGmtEl = document.getElementById('local-city-gmt');
    const localCityDateEl = document.getElementById('local-city-date');
    const digitalClockContainer = document.querySelector('.digital-clock-container');
    const infoIcon = document.querySelector('.info-icon');
    const editBtn = document.querySelector('.edit-btn');
    const topBar = document.querySelector('.top-bar');
    const footer = document.querySelector('.footer');
    const localClockContainer = document.querySelector('.local-clock-container');
    const rotationIndicator = document.getElementById('rotation-indicator');
    const offsetArcEl = document.getElementById('offset-arc');

    // --- Modals & Inputs ---
    const cityModal = document.getElementById('city-modal');
    const addEditModal = document.getElementById('add-edit-modal');
    const infoModal = document.getElementById('info-modal');
    const cityListEl = document.getElementById('city-list');
    const addEditTitle = document.getElementById('add-edit-title');
    
    // v3 UI Elements
    const citySearchInput = document.getElementById('city-search-input');
    const searchResultsEl = document.getElementById('search-results');
    const cityNameInput = document.getElementById('city-name-input');
    const timezoneInput = document.getElementById('timezone-input');


    // --- State ---
    let cities = [];
    let editingCityIndex = null;
    let timeOffsetInMinutes = 0;
    let isDragging = false;
    let previousAngle = 0;
    let clockCenterX, clockCenterY;
    let lastRotationDirection = 'right';

    // --- v3: Timezone Functions ---
    const gmtCache = new Map();

    function getGmtOffset(timeZone) {
        if (gmtCache.has(timeZone)) {
            return gmtCache.get(timeZone);
        }
        try {
            const now = new Date();
            const timeZoneFormat = new Intl.DateTimeFormat('en-US', {
                timeZone: timeZone,
                timeZoneName: 'longOffset'
            });
            const parts = timeZoneFormat.formatToParts(now);
            const gmtString = parts.find(part => part.type === 'timeZoneName').value;
            const offset = parseFloat(gmtString.replace('GMT', ''));
            gmtCache.set(timeZone, offset);
            return offset;
        } catch (e) {
            console.error(`Invalid timezone: ${timeZone}`, e);
            return 0; // Fallback to UTC
        }
    }


    // --- Core Functions ---

    function loadCities() {
        const savedCities = JSON.parse(localStorage.getItem('sknet-cities-v3'));
        if (savedCities && savedCities.length > 0) {
            cities = savedCities;
        } else {
            // Default cities
            cities = [
                { name: 'Seoul', timezone: 'Asia/Seoul', isLocal: true },
                { name: 'BOSK-KY', timezone: 'America/New_York', isLocal: false },
                { name: 'BOSK-TN', timezone: 'America/Chicago', isLocal: false },
                { name: 'SKBA', timezone: 'America/New_York', isLocal: false },
                { name: 'SKOH', timezone: 'Europe/Budapest', isLocal: false },
                { name: 'SKOJ', timezone: 'Asia/Shanghai', isLocal: false },
                { name: 'SKOY', timezone: 'Asia/Shanghai', isLocal: false }
            ];
        }
    }

    function saveCities() {
        localStorage.setItem('sknet-cities-v3', JSON.stringify(cities));
    }

    function updateClocks() {
        const now = new Date(new Date().getTime() + timeOffsetInMinutes * 60000);
        clockFace.querySelectorAll('.hand').forEach(hand => hand.remove());

        const localCity = cities.find(city => city.isLocal);
        if (!localCity) {
            if (cities.length > 0) {
                cities[0].isLocal = true;
                saveCities();
                updateClocks();
            }
            return;
        }

        const localGmtOffset = getGmtOffset(localCity.timezone);
        const localTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (3600000 * localGmtOffset));

        const localHours = localTime.getHours();
        const localMinutes = localTime.getMinutes();
        const localSeconds = localTime.getSeconds();
        const amPm = localHours >= 12 ? 'PM' : 'AM';
        digitalTimeEl.textContent = `${String(localHours % 12 || 12)}:${String(localMinutes).padStart(2, '0')}:${String(localSeconds).padStart(2, '0')}`;
        amPmEl.textContent = amPm;

        localCityNameEl.textContent = localCity.name;
        localCityGmtEl.textContent = `GMT${localGmtOffset >= 0 ? '+' : ''}${localGmtOffset}`;
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        localCityDateEl.textContent = localTime.toLocaleDateString('ko-KR', dateOptions);

        const cityGroups = new Map();
        cities.forEach(city => {
            const gmt = getGmtOffset(city.timezone);
            const group = cityGroups.get(gmt) || { names: [], isLocal: false, timezone: city.timezone };
            group.names.push(city.name);
            if (city.isLocal) {
                group.isLocal = true;
            }
            cityGroups.set(gmt, group);
        });
        
        const localCalendarDate = new Date(localTime.getFullYear(), localTime.getMonth(), localTime.getDate());

        cityGroups.forEach((group, gmt) => {
            const cityTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (3600000 * gmt));
            const cityHours = cityTime.getHours();
            const cityMinutes = cityTime.getMinutes();
            const angle = getAngleForHour(cityHours, cityMinutes);

            const hand = document.createElement('div');
            hand.className = 'hand';
            if (group.isLocal) {
                hand.classList.add('local-hand');
            } else {
                hand.classList.add('other-hand');
                hand.style.cursor = 'pointer';
                hand.addEventListener('click', () => setAsLocalByTimezone(group.timezone));
            }
            hand.style.transform = `rotate(${angle}deg)`;

            const cityName = document.createElement('span');
            cityName.className = 'city-on-hand';
            
            const cityText = document.createElement('span');
            cityText.textContent = group.names.join(',');
            cityName.appendChild(cityText);

            const cityCalendarDate = new Date(cityTime.getFullYear(), cityTime.getMonth(), cityTime.getDate());
            const dayDifference = (cityCalendarDate - localCalendarDate) / (1000 * 3600 * 24);

            if (dayDifference !== 0) {
                const diffText = dayDifference > 0 ? `+${dayDifference}` : `${dayDifference}`;
                const dateDiffIndicator = document.createElement('span');
                dateDiffIndicator.className = 'date-diff-indicator';
                dateDiffIndicator.textContent = diffText;
                cityName.appendChild(dateDiffIndicator);
            }

            if (angle >= 270 || angle <= 90) {
                cityName.style.backgroundColor = 'var(--blue-jean)';
            } else {
                cityName.style.backgroundColor = 'var(--black-color)';
            }
            
            let rotation = 270;
            if (angle >= 180 && angle < 360) {
                rotation = 90;
            }
            
            cityName.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

            hand.appendChild(cityName);
            clockFace.appendChild(hand);
        });

        updateTimeDiffText();
        updateOffsetArc(localGmtOffset);

        if (timeOffsetInMinutes !== 0) {
            lastRotationDirection = timeOffsetInMinutes > 0 ? 'right' : 'left'; // Added as per user request
            rotationIndicator.classList.remove('left', 'right');
            rotationIndicator.classList.add(lastRotationDirection);
            rotationIndicator.classList.add('show');
        } else {
            rotationIndicator.classList.remove('show');
        }
    }

    function updateTimeDiffText() {
        const localHand = clockFace.querySelector('.local-hand .city-on-hand');
        if (!localHand) return;
        
        let timeDiffEl = localHand.querySelector('.time-diff-text');

        if (timeOffsetInMinutes !== 0) {
            if (!timeDiffEl) {
                timeDiffEl = document.createElement('span');
                timeDiffEl.className = 'time-diff-text';
                localHand.appendChild(timeDiffEl);
            }
            const sign = timeOffsetInMinutes > 0 ? '+' : '-';
            const activeColor = timeOffsetInMinutes > 0 ? 'var(--time-diff-positive)' : 'var(--time-diff-negative)';
            const absMinutes = Math.abs(timeOffsetInMinutes);

            const days = Math.floor(absMinutes / 1440);
            const remainingMinutes = absMinutes % 1440;
            const hours = Math.floor(remainingMinutes / 60);
            const minutes = Math.round(remainingMinutes % 60);

            let diffText = '';
            if (days > 0) diffText += `${days}d `;
            if (hours > 0 || days > 0) diffText += `${hours}h `;
            diffText += `${minutes}m`;

            timeDiffEl.textContent = `${sign}${diffText.trim()}`;
            timeDiffEl.style.color = activeColor;
        } else {
            if (timeDiffEl) {
                timeDiffEl.remove();
            }
        }
    }

    function getAngleForHour(hour, minute) {
        const totalMinutes = hour * 60 + minute;
        const minutesInDay = 24 * 60;
        const shiftedMinutes = (totalMinutes - 720 + minutesInDay) % minutesInDay;
        const angle = (shiftedMinutes / minutesInDay) * 360;
        return angle;
    }

    function createClockFace() {
        const staticElements = clockFace.querySelectorAll('#offset-arc, .half, .sun-icon, .moon-icon, .rotation-indicator');
        clockFace.innerHTML = '';
        staticElements.forEach(el => clockFace.appendChild(el));

        const clockRect = clockFace.getBoundingClientRect();
        const clockRadius = clockRect.width / 2;

        for (let i = 0; i < 96; i++) {
            const angle = (i / 96) * 360;
            const isHour = i % 4 === 0;
            const isHalfHour = i % 2 === 0;

            const marker = document.createElement('div');
            let markerClass = 'marker-15min';
            if (isHour) markerClass = 'marker-hour';
            else if (isHalfHour) markerClass = 'marker-30min';
            marker.className = markerClass;

            const radius = clockRadius;
            const x = clockRadius + radius * Math.cos((angle - 90) * Math.PI / 180);
            const y = clockRadius + radius * Math.sin((angle - 90) * Math.PI / 180);
            marker.style.left = `${x}px`;
            marker.style.top = `${y}px`;
            marker.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
            clockFace.appendChild(marker);
        }

        for (let h = 0; h < 24; h++) {
            const angle = getAngleForHour(h, 0);
            const number = document.createElement('div');
            const isMajor = h % 6 === 0;
            number.className = isMajor ? 'major-hour-number' : 'hour-number-24';
            number.textContent = h === 0 ? 24 : h;

            const numRadius = clockRadius * 0.82;
            const numX = numRadius * Math.cos((angle - 90) * Math.PI / 180);
            const numY = numRadius * Math.sin((angle - 90) * Math.PI / 180);
            number.style.left = `calc(50% + ${numX}px)`;
            number.style.top = `calc(50% + ${numY}px)`;
            number.style.transform = `translate(-50%, -50%)`;
            clockFace.appendChild(number);
        }
        
        const handMarker = document.createElement('div');
        handMarker.className = 'hand-marker';
        clockFace.appendChild(handMarker);
    }

    function updateOffsetArc(localGmtOffset) {
        if (timeOffsetInMinutes === 0) {
            offsetArcEl.style.display = 'none';
            return;
        }

        offsetArcEl.style.display = 'block';

        const totalMinutes = Math.abs(timeOffsetInMinutes);
        const isPositive = timeOffsetInMinutes > 0;

        const color = isPositive ? 'var(--time-diff-positive)' : 'var(--time-diff-negative)';

        const realNow = new Date();
        const realUtc = new Date(realNow.getTime() + (realNow.getTimezoneOffset() * 60000));
        const localRealTime = new Date(realUtc.getTime() + (localGmtOffset * 3600000));

        const angle1 = getAngleForHour(localRealTime.getHours(), localRealTime.getMinutes());

        const offsetTime = new Date(localRealTime.getTime() + timeOffsetInMinutes * 60000);
        const angle2 = getAngleForHour(offsetTime.getHours(), offsetTime.getMinutes());

        let startAngle, endAngle;
        if (isPositive) {
            startAngle = angle1;
            endAngle = angle2;
        } else {
            startAngle = angle2;
            endAngle = angle1;
        }

        // Handle angle wrapping for conic-gradient
        if (endAngle <= startAngle) {
            endAngle += 360;
        }

        offsetArcEl.style.setProperty('--arc-color', color);
        offsetArcEl.style.setProperty('--start-angle', `${startAngle}deg`);
        offsetArcEl.style.setProperty('--end-angle', `${endAngle - startAngle}deg`);
    }

    // --- Modal & City Management (v3) ---

    function renderCityList() {
        cityListEl.innerHTML = '';
        cities.forEach((city, index) => {
            const li = document.createElement('li');
            const gmt = getGmtOffset(city.timezone);
            
            let buttons = `<button onclick="showEditCityModal(${index})">수정</button>`;
            if (!city.isLocal) {
                buttons += `<button onclick="setAsLocal(${index})">대표 설정</button>`;
                buttons += `<button onclick="deleteCity(${index})">삭제</button>`;
            } else {
                buttons += `<button onclick="deleteCity(${index})" disabled>삭제</button>`;
            }

            li.innerHTML = `<span>${city.name} (GMT${gmt >= 0 ? '+' : ''}${gmt})</span><div>${buttons}</div>`;
            cityListEl.appendChild(li);
        });
    }

    window.showAddCityModal = () => {
        editingCityIndex = null;
        addEditTitle.textContent = '도시 추가';
        cityNameInput.value = '';
        timezoneInput.value = '';
        citySearchInput.value = '';
        searchResultsEl.innerHTML = '';
        addEditModal.style.display = 'flex';
        cityModal.style.display = 'none';
    };

    window.showEditCityModal = (index) => {
        editingCityIndex = index;
        const city = cities[index];
        addEditTitle.textContent = '도시 수정';
        cityNameInput.value = city.name;
        timezoneInput.value = city.timezone;
        citySearchInput.value = '';
        searchResultsEl.innerHTML = '';
        addEditModal.style.display = 'flex';
        cityModal.style.display = 'none';
    };
    
    citySearchInput.addEventListener('input', () => {
        const searchTerm = citySearchInput.value.toLowerCase();
        searchResultsEl.innerHTML = '';
        if (searchTerm.length < 2) return;

        const results = timezones
            .filter(tz => tz.city.toLowerCase().includes(searchTerm) || tz.timezone.toLowerCase().includes(searchTerm))
            .slice(0, 5);

        results.forEach(tz => {
            const li = document.createElement('li');
            li.textContent = `${tz.city} (${tz.timezone})`;
            li.addEventListener('click', () => {
                cityNameInput.value = tz.city;
                timezoneInput.value = tz.timezone;
                searchResultsEl.innerHTML = '';
                citySearchInput.value = '';
            });
            searchResultsEl.appendChild(li);
        });
    });

    window.saveCity = () => {
        const name = cityNameInput.value.trim();
        const timezone = timezoneInput.value.trim();

        if (name && timezone) {
            try {
                getGmtOffset(timezone);
            } catch (e) {
                alert('유효하지 않은 IANA 시간대입니다.');
                return;
            }

            const newCity = {
                name: name,
                timezone: timezone,
                isLocal: false
            };

            if (editingCityIndex !== null) {
                newCity.isLocal = cities[editingCityIndex].isLocal;
                cities[editingCityIndex] = newCity;
            } else {
                cities.push(newCity);
            }

            saveCities();
            updateClocks();
            hideAddEditModal();
        } else {
            alert('도시 이름과 시간대를 모두 입력하세요.');
        }
    };
    
    window.setAsLocal = (index) => {
        cities.forEach((c, i) => {
            c.isLocal = (i === index);
        });
        saveCities();
        updateClocks();
        renderCityList();
    };

    function setAsLocalByTimezone(timezone) {
        const cityIndex = cities.findIndex(c => c.timezone === timezone);
        if (cityIndex !== -1) {
            window.setAsLocal(cityIndex);
        }
    }
    
    window.deleteCity = (index) => {
        if (cities[index].isLocal) {
            alert('대표 도시는 삭제할 수 없습니다. 다른 도시를 대표로 설정한 후 삭제해 주세요.');
            return;
        }
        if (confirm('정말 삭제하시겠습니까?')) {
            cities.splice(index, 1);
            saveCities();
            updateClocks();
            renderCityList();
        }
    };

    // --- Event Listeners & Initializers ---
    function updateClockCenter() {
        const clockRect = clockFace.getBoundingClientRect();
        clockCenterX = clockRect.left + clockRect.width / 2;
        clockCenterY = clockRect.top + clockRect.height / 2;
    }

    function resizeClock() {
        const topBarBottom = topBar.getBoundingClientRect().bottom;
        const footerTop = footer.getBoundingClientRect().top;
        const availableHeight = footerTop - topBarBottom;
        const availableWidth = localClockContainer.offsetWidth;
        let clockSize = Math.min(availableWidth, availableHeight) * 0.85;
        clockFace.style.width = `${clockSize}px`;
        clockFace.style.height = `${clockSize}px`;
        updateClockCenter();
    }

    clockFace.addEventListener('wheel', (event) => {
        event.preventDefault();
        // lastRotationDirection = event.deltaY < 0 ? 'right' : 'left'; // Removed as per user request
        timeOffsetInMinutes += (event.deltaY < 0 ? 15 : -15);
        updateClocks();
    });

    clockFace.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateClockCenter();
        previousAngle = Math.atan2(e.clientY - clockCenterY, e.clientX - clockCenterX);
        clockFace.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const currentAngle = Math.atan2(e.clientY - clockCenterY, e.clientX - clockCenterX);
        let deltaAngle = currentAngle - previousAngle;
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

        // lastRotationDirection = deltaAngle > 0 ? 'right' : 'left'; // Removed as per user request

        timeOffsetInMinutes += (deltaAngle / (2 * Math.PI)) * 1440;
        updateClocks();
        previousAngle = currentAngle;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        clockFace.style.cursor = 'grab';
    });

    clockFace.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            updateClockCenter();
            const touch = e.touches[0];
            previousAngle = Math.atan2(touch.clientY - clockCenterY, touch.clientX - clockCenterX);
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        e.preventDefault();
        const touch = e.touches[0];
        const currentAngle = Math.atan2(touch.clientY - clockCenterY, touch.clientX - clockCenterX);
        let deltaAngle = currentAngle - previousAngle;
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

        // lastRotationDirection = deltaAngle > 0 ? 'right' : 'left'; // Removed as per user request

        timeOffsetInMinutes += (deltaAngle / (2 * Math.PI)) * 1440;
        updateClocks();
        previousAngle = currentAngle;
    }, { passive: false });

    document.addEventListener('touchend', () => {
        isDragging = false;
    });

    digitalClockContainer.addEventListener('click', () => {
        timeOffsetInMinutes = 0;
        updateClocks();
    });

    rotationIndicator.addEventListener('click', () => {
        timeOffsetInMinutes = 0;
        updateClocks();
    });

    infoIcon.addEventListener('click', () => { infoModal.style.display = 'flex'; });
    editBtn.addEventListener('click', () => {
        window.showCityModal();
    });
    window.hideInfoModal = () => { infoModal.style.display = 'none'; };
    window.showCityModal = () => {
        cityModal.style.display = 'flex';
        renderCityList();
    };
    window.hideCityModal = () => { cityModal.style.display = 'none'; };
    window.hideAddEditModal = () => { addEditModal.style.display = 'none'; showCityModal(); };
    window.toggleCityList = () => { cityModal.style.display === 'flex' ? hideCityModal() : showCityModal(); };

    function setupAndDrawClocks() {
        resizeClock();
        createClockFace();
        updateClocks();
    }

    // Redraw on resize
    window.onresize = setupAndDrawClocks;

    // --- Initial Load ---
    loadCities();
    
    // Wait for all fonts to be loaded, then call setup twice to ensure stable layout.
    document.fonts.ready.then(() => {
        setupAndDrawClocks(); // First call to trigger layout
        setTimeout(setupAndDrawClocks, 50); // Second call to get final, stable dimensions
    });

    // Update the clock every second
    setInterval(updateClocks, 1000);

    // Clear the GMT offset cache periodically to check for DST changes
    setInterval(() => {
        gmtCache.clear();
        console.log('GMT cache cleared for DST check.');
    }, 30 * 60 * 1000); // every 30 minutes
});