const API_URL = 'https://script.google.com/macros/s/AKfycbzDO8jWrQxRI1xcTRI2EuKFkxyhxSEFwZq1TQmrCJpH3A2blnfrD8On-7grv-sIkSs3/exec';

// Changed to a let variable so it can be populated dynamically
let checkboxFields = [];
let appData = null;
let currentChapter = null;

async function loadData(){
    try{
        const response = await fetch(API_URL);
        const data = await response.json();
        appData = data;
        
        // Dynamic Extraction: Collect all unique columns across all chapters/verses
        const extractedFields = new Set();
        if (appData.chapters && Array.isArray(appData.chapters)) {
            appData.chapters.forEach(chapter => {
                if (chapter.verses && Array.isArray(chapter.verses)) {
                    chapter.verses.forEach(verse => {
                        Object.keys(verse).forEach(key => {
                            // Automatically skip the primary 'Verse' identifying column
                            if (key !== 'শ্লোক') {
                                extractedFields.add(key);
                            }
                        });
                    });
                }
            });
        }
        // Convert Set back to an array
        checkboxFields = Array.from(extractedFields);

        createCheckboxes();
        renderIndex();
    }
    catch(error){
        console.error(error);
        alert('Failed to load Google Sheet data');
    }
    finally{
        document.getElementById('loader').style.display = 'none';
    }
}

function createCheckboxes(){
    const container = document.getElementById('checkboxContainer');
    container.innerHTML = '';

    checkboxFields.forEach(field => {
        const label = document.createElement('label');

        label.innerHTML = `
            <input type="checkbox" value="${field}" checked>
            <span>${field}</span>
        `;

        container.appendChild(label);
    });

    // ✅ FIX: prevent scroll jump + stabilize UI
    container.addEventListener('change', (e) => {
        e.stopPropagation();

        // keeps scroll position stable
        const scrollY = window.scrollY;

        if(currentChapter){
            requestAnimationFrame(() => {
                renderChapter(currentChapter);
                window.scrollTo(0, scrollY);
            });
        }
    }, true);
}

function getSelectedFields(){
    return [
        ...document.querySelectorAll('#checkboxContainer input:checked')
    ].map(el => el.value);
}

function renderIndex(){
    const container = document.getElementById('indexContainer');
    container.innerHTML = '';

    appData.সূচীপত্র.forEach(item => {
        const card = document.createElement('div');
        card.className = 'index-item';

        let extraFields = '';
        Object.keys(item).forEach(key => {
            if(key !== 'Chapter' && item[key]){
                extraFields += `<div>${item[key]}</div>`;
            }
        });

        card.innerHTML = `
            <h3>${item['Chapter']}</h3>
            <div class="index-extra">${extraFields}</div>
        `;

        card.addEventListener('click', () => {
            renderChapter(item['Chapter']);
        });

        container.appendChild(card);
    });
}

function renderChapter(chapterName){
    currentChapter = chapterName;
    const chapter = appData.chapters.find(
        item => item.sheetName === chapterName
    );

    if(!chapter) return;

    document.getElementById('bookView').style.display = 'none';
    document.getElementById('chapterView').style.display = 'block';

    renderChapterHeader(chapterName);
    renderVerses(chapter);
    
    // ✅ Generates sequential back/next chapter buttons at the bottom of the page
    renderChapterNavigation(chapterName);

    window.scrollTo({
        top:0,
        behavior:'smooth'
    });
}

function renderChapterHeader(chapterName){
    const header = document.getElementById('chapterHeader');
    const chapterIndexData = appData.সূচীপত্র.find(
        item => item['Chapter'] === chapterName
    );

    let metaHTML = '';
    if(chapterIndexData){
        Object.keys(chapterIndexData).forEach(key => {
            if(key !== 'Chapter' && chapterIndexData[key]){
                metaHTML += `<div>${chapterIndexData[key]}</div>`;
            }
        });
    }

    header.innerHTML = `
        <button class="back-btn" onclick="backToIndex()">
            ← সূচীপত্রে ফিরে যান
        </button>
        <h2>${chapterName}</h2>
        <div class="chapter-meta">${metaHTML}</div>
    `;
}

function renderVerses(chapter){
    const selectedFields = getSelectedFields();
    const container = document.getElementById('versesContainer');
    container.innerHTML = '';

    chapter.verses.forEach(verse => {
        const card = document.createElement('div');
        card.className = 'verse-card';

        // 'Verse' এর পরিবর্তে 'শ্লোক' কলাম রিড করা হচ্ছে
        const fullVerse = verse['শ্লোক'] || '';
        const verseOnly = fullVerse.includes('-') ? fullVerse.split('-')[1] : fullVerse;
        const formattedVerse = verseOnly.replaceAll('_', ', ');

        let html = `
            <div class="verse-number">
                শ্লোক ${formattedVerse} </div>
        `;

        selectedFields.forEach(field => {
            if(verse[field]){
                let extraClass = '';

                // নতুন বাংলা কলামের নাম অনুযায়ী সিএসএস ক্লাস ম্যাপিং
                if(field === 'সংষ্কৃতম্'){
                    extraClass = 'sanskrit';
                }
                else if(field === 'English Transliteration'){
                    extraClass = 'english-transliteration';
                }
                else if(field === 'English Translation'){
                    extraClass = 'english-text';
                }
                else if(field === 'লিপ্যন্তর'){
                    extraClass = 'bangla-transliteration';
                }
                else if(field === 'অনুবাদ'){
                    extraClass = 'bangla-text';
                }
                else if(field.includes('গীতার') && field.includes('গান')){
                    extraClass = 'gitar-gaan-text'; 
                }
                else if(field.trim() === 'তাৎপর্য'){
                    extraClass = 'purport-text'; 
                }
                else {
                    // নতুন কোনো কলাম যোগ করলে স্বয়ংক্রিয় ডায়নামিক ক্লাস তৈরি হবে
                    extraClass = 'dynamic-' + field.toLowerCase().replace(/[^a-z0-9]/g, '-');
                }

                html += `
                    <div class="field">
                        <div class="field-title">${field}</div>
                        <div class="field-content ${extraClass}">${verse[field]}</div>
                    </div>
                `;
            }
        });

        card.innerHTML = html;
        container.appendChild(card);
    });
}

// ✅ Renders relative dynamic step navigation between sequential chapters
function renderChapterNavigation(chapterName) {
    const navContainer = document.getElementById('chapterNavigation');
    if (!navContainer) return;

    const currentIndex = appData.সূচীপত্র.findIndex(item => item['Chapter'] === chapterName);
    
    const prevChapterItem = appData.সূচীপত্র[currentIndex - 1];
    const nextChapterItem = appData.সূচীপত্র[currentIndex + 1];

    let html = '';

    // 1. Only render "পূর্ববর্তী: অধ্যায়" button if a real preceding chapter exists (hidden on Chapter 1)
    if (prevChapterItem && prevChapterItem['Chapter']) {
        const prevChapterName = prevChapterItem['Chapter'];
        html += `
            <button class="nav-btn prev-chap-btn" onclick="renderChapter('${prevChapterName}')">
                ← পূর্ববর্তী: ${prevChapterName}
            </button>
        `;
    }

    // 2. Only render "পরবর্তী: অধ্যায়" button if a real following chapter exists (hidden on Chapter 18)
    if (nextChapterItem && nextChapterItem['Chapter']) {
        const nextChapterName = nextChapterItem['Chapter'];
        html += `
            <button class="nav-btn next-chap-btn" onclick="renderChapter('${nextChapterName}')">
                পরবর্তী: ${nextChapterName} →
            </button>
        `;
    }

    navContainer.innerHTML = html;
}

function backToIndex(){
    document.getElementById('chapterView').style.display = 'none';
    document.getElementById('bookView').style.display = 'block';
    window.scrollTo({
        top:0,
        behavior:'smooth'
    });
}

loadData();
