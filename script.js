const API_URL = 'https://script.google.com/macros/s/AKfycbzDO8jWrQxRI1xcTRI2EuKFkxyhxSEFwZq1TQmrCJpH3A2blnfrD8On-7grv-sIkSs3/exec';

let checkboxFields = [];
let appData = null;
let currentChapter = null;

async function loadData(){
    try{
        const response = await fetch(API_URL);
        const data = await response.json();
        appData = data;
        
        const extractedFields = new Set();
        if (appData.chapters && Array.isArray(appData.chapters)) {
            appData.chapters.forEach(chapter => {
                if (chapter.verses && Array.isArray(chapter.verses)) {
                    chapter.verses.forEach(verse => {
                        Object.keys(verse).forEach(key => {
                            if (key !== 'শ্লোক') {
                                extractedFields.add(key);
                            }
                        });
                    });
                }
            });
        }
        checkboxFields = Array.from(extractedFields);

        createCheckboxes();
        renderIndex();
        initMainJumpFilter(); // হোমপেইজ ফিল্টার ইনিশিয়ালাইজেশন
    }
    catch(error){
        console.error(error);
        alert('Failed to load Google Sheet data');
    }
    finally{
        document.getElementById('loader').style.display = 'none';
    }
}

// হোমপেইজের অধ্যায় ড্রপডাউন পপুলেট করা
function initMainJumpFilter() {
    const mainChapSelect = document.getElementById('mainChapterSelect');
    mainChapSelect.innerHTML = '<option value="">অধ্যায় নির্বাচন করুন</option>';
    
    appData.সূচীপত্র.forEach(item => {
        const option = document.createElement('option');
        option.value = item['Chapter'];
        option.textContent = item['Chapter'];
        mainChapSelect.appendChild(option);
    });
}

// অধ্যায় পরিবর্তনের ওপর ভিত্তি করে শ্লোক ড্রপডাউন আপডেট করা
function populateVerses(type) {
    if (type === 'main') {
        const chapName = document.getElementById('mainChapterSelect').value;
        const verseSelect = document.getElementById('mainVerseSelect');
        
        if (!chapName) {
            verseSelect.innerHTML = '<option value="">শ্লোক নির্বাচন করুন</option>';
            verseSelect.disabled = true;
            return;
        }

        const chapter = appData.chapters.find(item => item.sheetName === chapName);
        verseSelect.innerHTML = '<option value="">শ্লোক নির্বাচন করুন</option>';
        
        if (chapter && chapter.verses) {
            chapter.verses.forEach(v => {
                const fullVerse = v['শ্লোক'] || '';
                const verseOnly = fullVerse.includes('-') ? fullVerse.split('-')[1] : fullVerse;
                const formattedVerse = verseOnly.replaceAll('_', ', ');
                
                const option = document.createElement('option');
                option.value = fullVerse; // আইডি হিসেবে ফুল শ্লোক টেক্সট রাখছি
                option.textContent = `শ্লোক ${formattedVerse}`;
                verseSelect.appendChild(option);
            });
            verseSelect.disabled = false;
        }
    }
}

// নির্দিষ্ট শ্লোকে স্ক্রোল করে জাম্প করার ফাংশন
function jumpToVerse(type) {
    let chapName, verseValue;

    if (type === 'main') {
        chapName = document.getElementById('mainChapterSelect').value;
        verseValue = document.getElementById('mainVerseSelect').value;
        if (!chapName || !verseValue) return alert('দয়া করে অধ্যায় ও শ্লোক উভয়ই সিলেক্ট করুন।');
        
        // প্রথমে অধ্যায় ভিউ ওপেন করবে
        renderChapter(chapName);
    } else {
        chapName = currentChapter;
        verseValue = document.getElementById('chapVerseSelect').value;
        if (!verseValue) return alert('দয়া করে শ্লোক সিলেক্ট করুন।');
    }

    // শ্লোক কার্ড খুঁজে বের করে স্ক্রোল করা
    setTimeout(() => {
        const targetCard = document.getElementById(`verse-${verseValue}`);
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // একটু হাইলাইট করার জন্য ফ্ল্যাশ ইফেক্ট
            targetCard.style.background = '#ead8b1';
            setTimeout(() => { targetCard.style.background = '#fdf6e3'; }, 1500);
        }
    }, 400); // ভিউ রেন্ডার হওয়ার জন্য সামান্য সময় দেওয়া
}

// [বাকি createCheckboxes, getSelectedFields, renderIndex ফাংশনগুলো আগের মতোই থাকবে]
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

    container.addEventListener('change', (e) => {
        e.stopPropagation();
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
    renderChapterNavigation(chapterName);

    // অধ্যায়ের ভেতরের শ্লোক ড্রপডাউন পপুলেট করা
    const chapVerseSelect = document.getElementById('chapVerseSelect');
    chapVerseSelect.innerHTML = '<option value="">শ্লোক নির্বাচন করুন</option>';
    chapter.verses.forEach(v => {
        const fullVerse = v['শ্লোক'] || '';
        const verseOnly = fullVerse.includes('-') ? fullVerse.split('-')[1] : fullVerse;
        const formattedVerse = verseOnly.replaceAll('_', ', ');
        
        const option = document.createElement('option');
        option.value = fullVerse;
        option.textContent = `শ্লোক ${formattedVerse}`;
        chapVerseSelect.appendChild(option);
    });

    // সরাসরি সূচীপত্র থেকে না আসলে স্ক্রোল টপে যাবে
    if (document.activeElement.tagName !== 'BUTTON') {
        window.scrollTo({ top:0, behavior:'smooth' });
    }
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
        
        // এখানে প্রতিটি কার্ডে একটি ইউনিক ID দেওয়া হচ্ছে স্ক্রোল করার সুবিধার জন্য
        const fullVerse = verse['শ্লোক'] || '';
        card.id = `verse-${fullVerse}`; 

        const verseOnly = fullVerse.includes('-') ? fullVerse.split('-')[1] : fullVerse;
        const formattedVerse = verseOnly.replaceAll('_', ', ');

        let html = `
            <div class="verse-number">শ্লোক ${formattedVerse}</div>
        `;

        selectedFields.forEach(field => {
            if(verse[field]){
                let extraClass = '';

                if(field === 'সংষ্কৃতম্'){ extraClass = 'sanskrit'; }
                else if(field === 'English Transliteration'){ extraClass = 'english-transliteration'; }
                else if(field === 'English Translation'){ extraClass = 'english-text'; }
                else if(field === 'লিপ্যন্তর'){ extraClass = 'bangla-transliteration'; }
                else if(field === 'অনুবাদ'){ extraClass = 'bangla-text'; }
                else if(field.includes('গীতার') && field.includes('গান')){ extraClass = 'gitar-gaan-text'; }
                else if(field.trim() === 'তাৎপর্য'){ extraClass = 'purport-text'; }
                else { extraClass = 'dynamic-' + field.toLowerCase().replace(/[^a-z0-9]/g, '-'); }

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

// [বাকি ফাংশনগুলো আগের মতোই থাকবে]
function renderChapterNavigation(chapterName) {
    const navContainer = document.getElementById('chapterNavigation');
    if (!navContainer) return;

    const currentIndex = appData.সূচীপত্র.findIndex(item => item['Chapter'] === chapterName);
    const prevChapterItem = appData.সূচীপত্র[currentIndex - 1];
    const nextChapterItem = appData.সূচীপত্র[currentIndex + 1];

    let html = '';

    if (prevChapterItem && prevChapterItem['Chapter']) {
        const prevChapterName = prevChapterItem['Chapter'];
        html += `
            <button class="nav-btn prev-chap-btn" onclick="renderChapter('${prevChapterName}')">
                ← পূর্ববর্তী: ${prevChapterName}
            </button>
        `;
    }

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
    
    // হোমপেইজে ফিরে আসার পর ড্রপডাউন রিসেট করা
    document.getElementById('mainChapterSelect').value = "";
    document.getElementById('mainVerseSelect').innerHTML = '<option value="">শ্লোক নির্বাচন করুন</option>';
    document.getElementById('mainVerseSelect').disabled = true;

    window.scrollTo({ top:0, behavior:'smooth' });
}

loadData();
