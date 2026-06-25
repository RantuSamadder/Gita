const API_URL = 'https://script.google.com/macros/s/AKfycbzDO8jWrQxRI1xcTRI2EuKFkxyhxSEFwZq1TQmrCJpH3A2blnfrD8On-7grv-sIkSs3/exec';

let appData = null;
let currentChapter = null;

async function loadData(){
    try{
        const response = await fetch(API_URL);
        const data = await response.json();
        appData = data;
        
        renderIndex();
        initMainJumpFilter(); // হোমপেইজ ফিল্টার ইনিশিয়ালাইজেশন
    }
    catch(error){
        console.error(error);
        alert('Failed to load Google Sheet data');
    }
    finally{
        document.getElementById('loader').style.display = 'none';
    }
}

// হোমপেইজের অধ্যায় ড্রপডাউন পপুলেট করা
function initMainJumpFilter() {
    const mainChapSelect = document.getElementById('mainChapterSelect');
    mainChapSelect.innerHTML = '<option value="">অধ্যায় নির্বাচন করুন</option>';
    
    appData.সূচীপত্র.forEach(item => {
        const option = document.createElement('option');
        option.value = item['Chapter'];
        option.textContent = item['Chapter'];
        mainChapSelect.appendChild(option);
    });
}

// অধ্যায় পরিবর্তনের ওপর ভিত্তি করে শ্লোক ড্রপডাউন আপডেট করা
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
                option.value = fullVerse; 
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
        if (!chapName || !verseValue) return alert('দয়া করে অধ্যায় ও শ্লোক উভয়ই সিলেক্ট করুন।');
        
        renderChapter(chapName);
    } else {
        chapName = currentChapter;
        verseValue = document.getElementById('chapVerseSelect').value;
        if (!verseValue) return alert('দয়া করে শ্লোক সিলেক্ট করুন।');
    }

    setTimeout(() => {
        const targetCard = document.getElementById(`verse-${verseValue}`);
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            targetCard.style.background = '#ead8b1';
            setTimeout(() => { targetCard.style.background = '#fdf6e3'; }, 1500);
        }
    }, 400); 
}

// অধ্যায়ের কলাম অনুযায়ী ডাইনামিকালি চেকবক্স তৈরি করার ফাংশন (আপডেটেড)
function createCheckboxesForChapter(chapter){
    const container = document.getElementById('checkboxContainer');
    container.innerHTML = '';

    // যদি অধ্যায়ে কোনো শ্লোক না থাকে তবে ফেরত যাবে
    if (!chapter.verses || chapter.verses.length === 0) return;

    // এই অধ্যায়ের প্রথম শ্লোক থেকে সমস্ত কলামের নাম (হেডার) বের করা হচ্ছে
    const firstVerse = chapter.verses[0];
    const fields = Object.keys(firstVerse).filter(key => key !== 'শ্লোক');

    // পূর্বের সিলেক্টেড স্টেট ধরে রাখার জন্য (যদি ইউজার কোনো চেকবক্স আনচেক করে থাকেন)
    // প্রথমবার রেন্ডারের সময় সব চেকড (checked) থাকবে
    fields.forEach(field => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" value="${field}" checked>
            <span>${field}</span>
        `;
        container.appendChild(label);
    });
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
            renderChapter(item['Chapter'], true); // প্রথমবার অধ্যায়ে ঢুকলে চেকবক্স নতুন করে তৈরি হবে
        });

        container.appendChild(card);
    });
}

// renderChapter ফাংশনে সামান্য পরিবর্তন আনা হয়েছে (আপডেটেড)
function renderChapter(chapterName, isFirstLoad = false){
    currentChapter = chapterName;
    const chapter = appData.chapters.find(
        item => item.sheetName === chapterName
    );

    if(!chapter) return;

    document.getElementById('bookView').style.display = 'none';
    document.getElementById('chapterView').style.display = 'block';

    // যদি সরাসরি সূচীপত্র থেকে বা প্রথমবার অধ্যায়ে আসে, তবেই নতুন চেকবক্স লিস্ট তৈরি হবে
    if (isFirstLoad) {
        createCheckboxesForChapter(chapter);
        
        // চেকবক্সের চেঞ্জ ইভেন্ট লিসেনার সেট করা (ডুপ্লিকেট ইভেন্ট এড়াতে একবারই সেট করা ভালো)
        const container = document.getElementById('checkboxContainer');
        container.onchange = (e) => {
            e.stopPropagation();
            const scrollY = window.scrollY;
            if(currentChapter){
                requestAnimationFrame(() => {
                    renderVerses(chapter); // শুধু শ্লোকগুলো রি-রেন্ডার হবে, পুরো চ্যাপ্টার নয়
                    window.scrollTo(0, scrollY);
                });
            }
        };
    }

    renderChapterHeader(chapterName);
    renderVerses(chapter);
    renderChapterNavigation(chapterName);

    // অধ্যায়ের ভেতরের শ্লোক ড্রপডাউন পপুলেট করা
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
            <button class="nav-btn prev-chap-btn" onclick="renderChapter('${prevChapterName}', true)">
                ← পূর্ববর্তী: ${prevChapterName}
            </button>
        `;
    }

    if (nextChapterItem && nextChapterItem['Chapter']) {
        const nextChapterName = nextChapterItem['Chapter'];
        html += `
            <button class="nav-btn next-chap-btn" onclick="renderChapter('${nextChapterName}', true)">
                পরবর্তী: ${nextChapterName} →
            </button>
        `;
    }

    navContainer.innerHTML = html;
}

function backToIndex(){
    document.getElementById('chapterView').style.display = 'none';
    document.getElementById('bookView').style.display = 'block';
    
    document.getElementById('mainChapterSelect').value = "";
    document.getElementById('mainVerseSelect').innerHTML = '<option value="">শ্লোক নির্বাচন করুন</option>';
    document.getElementById('mainVerseSelect').disabled = true;

    window.scrollTo({ top:0, behavior:'smooth' });
}

loadData();
