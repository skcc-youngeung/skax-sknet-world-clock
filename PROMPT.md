# 프로젝트 생성 프롬프트: 24시간 아날로그 월드 클럭 (v3)

## v3 개발 목표

- **서머타임(DST) 자동 적용**: IANA 시간대를 기반으로 서머타임을 자동 계산하여 정확한 시간을 표시합니다.
- **사용자 경험(UX) 개선**: 도시 검색, 커스텀 이름 지정 등 도시 관리 기능을 대폭 개선합니다.

---

## 1. 프로젝트 개요

### 1.1. 핵심 기능
- **서머타임 자동 적용**: `timezones.js`에 정의된 IANA 시간대와 `Intl` API를 사용하여 서머타임을 자동으로 계산합니다.
- **도시 검색 기능**: 약 100개의 주요 도시 목록(`timezones.js`)에서 도시를 검색하고 자동 완성으로 쉽게 추가할 수 있습니다.
- **커스텀 도시 이름**: 사용자가 선택한 시간대에 원하는 표시 이름(예: "LA 오피스")을 지정할 수 있습니다.
- **수동 시간대 입력**: 목록에 없는 도시나 특정 시간대를 위해 IANA 시간대 이름을 직접 입력할 수 있는 옵션을 제공합니다.
- **24시간 아날로그 시계**: 24시간을 한 바퀴로 표시하는 아날로그 시계.
- **다중 도시 시간 표시**: 동일한 시간대의 도시는 하나의 바늘에 묶어서 표시.
- **PWA 지원**: `manifest.json`을 통한 앱 설치 지원.
- **Docker 컨테이너화**: `docker-compose.yml`에서 `nginx` 공식 이미지를 직접 사용하고, 로컬의 `html` 폴더를 볼륨 마운트하여 실시간 코드 변경을 지원합니다.

---

## 2. 파일 구조

- **`html/`**: 웹 서버가 서빙하는 모든 정적 파일을 포함합니다.
  - `index.html`
  - `style.css`
  - `script.js`
  - `timezones.js`
  - `manifest.json`
  - `favicon.ico`
  - `icons/`
- **`docker-compose.yml`**: Docker 컨테이너 실행을 위한 설정 파일입니다.
- **`PROMPT.md`**: AI 프롬프트 문서입니다.
- **`README.md`**: 프로젝트 설명 문서입니다.
- **`screenshot/`**: 개발용 스크린샷 폴더입니다.

---

## v3.1 추가 기능

### 1. 회전 방향 표시 및 시간 리셋 기능
- **요구사항**: 시간을 수동으로 조정할 때, 시계 중앙에 마지막 조정 방향(좌/우)을 나타내는 원형 화살표 아이콘을 표시합니다. 이 아이콘은 시간이 현재 시간과 다를 때만 표시되어야 합니다. 아이콘을 클릭하면 시간이 현재 시간으로 즉시 복귀하고, 아이콘은 사라져야 합니다.
- **구현**:
    - `index.html`: 시계 페이스 내부에 아이콘을 위한 `div` 태그(`id="rotation-indicator"`)를 추가합니다.
    - `style.css`:
        - `.rotation-indicator` 클래스에 `position`, `opacity`, `transition` 등 기본 스타일을 적용하고, `pointer-events: none`으로 초기에는 클릭되지 않도록 설정합니다.
        - `.rotation-indicator.show` 클래스에 `opacity: 0.7`과 `pointer-events: auto`를 설정하여, 보일 때만 클릭이 가능하도록 합니다.
        - `.rotation-indicator.left` 및 `.rotation-indicator.right` 클래스에 `background-image`로 각 방향에 맞는 원형 화살표 SVG 아이콘을 설정합니다.
    - `script.js`:
        - `lastRotationDirection` 변수를 추가하여 마지막 회전 방향을 저장합니다.
        - `updateClocks` 함수에서 `timeOffsetInMinutes`가 0이 아닐 경우, `timeOffsetInMinutes`의 부호에 따라 `lastRotationDirection`을 설정하고, 아이콘에 `left` 또는 `right` 클래스를 추가하고 `show` 클래스를 붙여 표시합니다. 0일 경우 `show` 클래스를 제거하여 숨깁니다.
        - `rotationIndicator` 요소에 `click` 이벤트 리스너를 추가하여, 클릭 시 `timeOffsetInMinutes`를 0으로 리셋하고 `updateClocks()`를 호출합니다.

### 2. 커스텀 시간대 및 기본 도시 목록 변경
- **요구사항**:
    1. `timezones.js` 파일에 `BOSK-KY`, `BOSK-TN`, `SKBA`, `SKOH`, `SKOJ`, `SKOY` 6개의 커스텀 시간대가 항상 존재해야 합니다.
    2. 앱의 기본 도시 목록을 `Seoul` 및 위의 6개 커스텀 시간대를 포함한 7개로 설정합니다. `Seoul`을 기본 대표 도시로 합니다.
- **구현**:
    - `timezones.js`: IANA 시간대 목록에 6개의 커스텀 시간대 객체를 추가합니다.
    - `script.js`:
        - `loadCities` 함수 내의 기본 도시 목록(`cities` 배열)을 새로운 7개 도시 목록으로 교체합니다.
        - `Seoul` 객체에는 `isLocal: true` 속성을 포함합니다.

### 3. 스마트폰 터치 조작 기능 추가
- **요구사항**: 스마트폰에서 터치 드래그로 시계 바늘을 조정할 수 있도록 지원합니다.
- **구현**:
    - `script.js`: `clockFace` 요소에 `touchstart`, `touchmove`, `touchend` 이벤트 리스너를 추가합니다.
    - `touchmove` 이벤트 리스너 내에서 `e.preventDefault()`를 호출하여, 시계 조작 시 페이지가 스크롤되는 현상을 방지합니다.
    - 각 이벤트 리스너는 기존의 마우스 이벤트(`mousedown`, `mousemove`, `mouseup`)와 유사한 로직을 수행하되, `e.touches[0]`를 사용하여 터치 좌표를 가져옵니다.

### 4. 반응형 레이아웃 개선 (Safe Area 적용)
- **요구사항**: 아이폰의 노치나 데스크톱 브라우저 등 다양한 환경에서 상/하단 콘텐츠가 잘리는 현상을 수정합니다. 모든 기기에서 최소 여백을 보장하고 시스템 UI를 자동으로 회피하도록 개선합니다.
- **구현**:
    - `index.html`: `viewport` 메타 태그에 `viewport-fit=cover`를 추가합니다.
    - `style.css`: `.main-container`의 `padding` 속성을 `max()`와 `env(safe-area-inset-*)`를 사용하는 4개의 개별 `padding` 속성(top, right, bottom, left)으로 교체합니다.
    - `style.css`: `.top-bar`의 `height`를 80px로 설정하고 `align-items: flex-end`로 변경하며, `margin-bottom: 20px`를 추가합니다.
    - `style.css`: `.footer`의 `height`를 80px로 설정하고 `align-items: flex-start`로 변경하며, `margin-top: 20px`를 추가합니다.

### 5. 푸터 아이콘 레이아웃 변경
- **요구사항**: 하단 푸터의 아이콘(⚙️, ℹ️)들이 'WORLD CLOCK' 텍스트 양옆에 위치하도록 변경합니다. 아이콘과 텍스트 사이에 적절한 여백을 둡니다.
- **구현**:
    - `style.css`: `.footer-content`의 `align-items`를 `center`로 변경하고 `position: relative`를 제거합니다.
    - `style.css`: `.footer-content .edit-btn` 및 `.footer-content .info-icon`에 대한 `position: absolute` 관련 속성(`position`, `left`, `right`, `top`, `transform`)을 모두 제거합니다.
    - `style.css`: 두 아이콘에 `padding`을 추가하여 텍스트와의 간격을 확보합니다. (예: `padding: 0 20px;`)

---

## v3.2 CSS 변수 리팩토링

### 1. 시간 차이 색상 변수 통일
- **요구사항**: 시간 차이를 나타내는 색상 변수를 단순화합니다. 기존에는 시간 차이(24h, 48h, 48h+)에 따라 여러 단계의 변수(`--time-diff-positive1`, `2`, `3` 등)를 사용했으나, 이를 단일 변수로 통일하여 코드를 간소화합니다.
- **구현**:
    - `style.css`:
        - `:root`에 정의된 `--time-diff-positive1`, `2`, `3`과 `--time-diff-negative1`, `2`, `3` 변수를 모두 제거합니다.
        - 양수 시간 차이는 `--time-diff-positive`, 음수 시간 차이는 `--time-diff-negative` 단일 변수만 남겨둡니다.
    - `script.js`:
        - `updateOffsetArc` 함수 내에서 시간 차이에 따라 다른 변수를 할당하던 `if/else if` 로직을 삭제합니다.
        - 시간 차이의 부호에 따라 `--time-diff-positive` 또는 `--time-diff-negative` 변수를 직접 사용하도록 코드를 단순화합니다.

---

## v3.3 Docker 설정 리팩토링

### 1. 개발 환경 효율화
- **요구사항**: 코드 수정 시 Docker 이미지를 매번 재빌드해야 하는 비효율적인 개발 방식을 개선합니다. 로컬 파일 시스템을 컨테이너에 마운트하여, 코드 변경이 즉시 반영되도록 합니다.
- **구현**:
    - **`html` 폴더 생성**: 웹 서버가 서빙할 모든 정적 파일(`index.html`, `style.css` 등)을 `html` 폴더로 이동시켜 프로젝트 구조를 정리합니다.
    - **`Dockerfile` 삭제**: Nginx 공식 이미지를 직접 사용하므로, 커스텀 `Dockerfile`은 더 이상 필요하지 않아 삭제합니다.
    - **`docker-compose.yml` 수정**:
        - `build: .` 대신 `image: nginx:alpine`을 사용하여 Nginx 공식 이미지를 직접 참조합니다.
        - `volumes` 항목을 추가하여 로컬의 `./html` 폴더를 컨테이너의 `/usr/share/nginx/html` 경로에 마운트합니다.

---

## v3.4 렌더링 타이밍 버그 수정

### 1. 초기 로드 시 시계 겹침 현상 해결
- **문제점**: 페이지를 새로고침할 때, `flex-grow`로 레이아웃이 동적으로 계산되고 웹 폰트가 로드되는 시간차 때문에 `resizeClock()` 함수가 불안정한 시점에 호출되었다. 이로 인해 아날로그 시계가 실제보다 크게 계산되어 상단 디지털 시계 영역을 침범하는 버그가 발생했다. `window.onload`나 `document.fonts.ready`만으로는 이 복잡한 렌더링 경쟁 상태를 완전히 해결할 수 없었다.
- **해결 방안**: "이중 호출(double call)" 기법을 도입했다.
    - `document.fonts.ready`가 완료되면, `setupAndDrawClocks()` 함수를 즉시 한번 호출하여 브라우저가 Flexbox 레이아웃을 그리도록 유도한다.
    - 그 후, `setTimeout`을 이용해 50ms의 아주 짧은 지연을 주고 `setupAndDrawClocks()` 함수를 한번 더 호출한다.
    - 이 두 번째 호출은 모든 레이아웃 계산이 완료된 안정적인 상태에서 실행되므로, 정확한 크기를 계산하여 시계를 다시 그려 겹침 문제를 해결한다.