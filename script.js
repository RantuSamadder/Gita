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

// হোমপেইজের অধ্যায় ড্রপডাউন পপুলেট করা (ভূমিকা ও মুখবন্ধ বাদ দিয়ে)
function initMainJumpFilter() {
    const mainChapSelect = document.getElementById('mainChapterSelect');
    mainChapSelect.innerHTML = '<option value="">অধ্যায় নির্বাচন করুন</option>';
    
    appData.সূচীপত্র.forEach(item => {
        // ভূমিকা এবং মুখবন্ধ অধ্যায় দুটিকে মেইন হোমপেইজ জাম্প ফিল্টারে আনা হবে না
        if (item['Chapter'] !== 'ভূমিকা' && item['Chapter'] !== 'মুখবন্ধ') {
            const option = document.createElement('option');
            option.value = item['Chapter'];
            option.textContent = item['Chapter'];
            mainChapSelect.appendChild(option);
        }
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
        
        renderChapter(chapName, true); 
    } else {
        chapName = currentChapter;
        verseValue = document.getElementById('chapVerseSelect').value;
        if (!verseValue) return alert('দয়া করে শ্লোক সিলেক্ট করুন।');
    }

    // শ্লোক কার্ড খুঁজে বের করে স্ক্রোল করা
    setTimeout(() => {
        const targetCard = document.getElementById(`verse-${verseValue}`);
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            targetCard.style.background = '#ead8b1';
            setTimeout(() => { targetCard.style.background = '#fdf6e3'; }, 1500);
        }
    }, 500);
}

// অধ্যায়ের কলাম অনুযায়ী ডাইনামিকালি চেকবক্স তৈরি করার ফাংশন
function createCheckboxesForChapter(chapter){
    const container = document.getElementById('checkboxContainer');
    container.innerHTML = '';

    if (!chapter.verses || chapter.verses.length === 0) return;

    const firstVerse = chapter.verses[0];
    const fields = Object.keys(firstVerse).filter(key => key !== 'শ্লোক');

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
            renderChapter(item['Chapter'], true); 
        });

        container.appendChild(card);
    });
}

// অধ্যায় রেন্ডারিং হ্যান্ডলার
function renderChapter(chapterName, isFirstLoad = false){
    currentChapter = chapterName;
    const chapter = appData.chapters.find(
        item => item.sheetName === chapterName
    );

    if(!chapter) return;

    document.getElementById('bookView').style.display = 'none';
    document.getElementById('chapterView').style.display = 'block';

    // এলিমেন্টগুলো সিলেক্ট করা
    const checkboxControls = document.querySelector('.controls');
    const chapterJumpControls = document.querySelector('.chapter-jump');

    // ভূমিকা অথবা মুখবন্ধ হলে পাঠ বিন্যাস ও শ্লোক জাম্প সেকশন হাইড হবে
    if (chapterName === 'ভূমিকা' || chapterName === 'মুখবন্ধ') {
        if (checkboxControls) checkboxControls.style.display = 'none';
        if (chapterJumpControls) chapterJumpControls.style.display = 'none';
    } else {
        if (checkboxControls) checkboxControls.style.display = 'block';
        if (chapterJumpControls) chapterJumpControls.style.display = 'block';
    }

    // নতুন অধ্যায় প্রথমবার লোড হলে চেকবক্স তৈরি হবে (ভূমিকা/মুখবন্ধ বাদে)
    if (isFirstLoad && chapterName !== 'ভূমিকা' && chapterName !== 'মুখবন্ধ') {
        createCheckboxesForChapter(chapter);
        
        const container = document.getElementById('checkboxContainer');
        container.onchange = (e) => {
            e.stopPropagation();
            const scrollY = window.scrollY;
            if(currentChapter){
                requestAnimationFrame(() => {
                    renderVerses(chapter); 
                    window.scrollTo(0, scrollY);
                });
            }
        };
    }

    renderChapterHeader(chapterName);
    renderVerses(chapter);
    renderChapterNavigation(chapterName);

    // অধ্যায়ের ভেতরের শ্লোক ড্রপডাউন পপুলেট করা (ভূমিকা/মুখবন্ধ বাদে)
    const chapVerseSelect = document.getElementById('chapVerseSelect');
    if (chapVerseSelect) {
        chapVerseSelect.innerHTML = '<option value="">শ্লোক নির্বাচন করুন</option>';
        if (chapter.verses && chapterName !== 'ভূমিকা' && chapterName !== 'মুখবন্ধ') {
            chapter.verses.forEach(v => {
                const fullVerse = v['শ্লোক'] || '';
                const verseOnly = fullVerse.includes('-') ? fullVerse.split('-')[1] : fullVerse;
                const formattedVerse = verseOnly.replaceAll('_', ', ');
                
                const option = document.createElement('option');
                option.value = fullVerse;
                option.textContent = `শ্লোক ${formattedVerse}`;
                chapVerseSelect.appendChild(option);
            });
        }
    }

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
    // ভূমিকা বা মুখবন্ধ হলে সব ফিল্ড ডাইনামিকালি সিলেক্টেড থাকবে (যেহেতু চেকবক্স নেই)
    let selectedFields = [];
    if (currentChapter === 'ভূমিকা' || currentChapter === 'মুখবন্ধ') {
        if (chapter.verses && chapter.verses.length > 0) {
            selectedFields = Object.keys(chapter.verses[0]).filter(key => key !== 'শ্লোক');
        }
    } else {
        selectedFields = getSelectedFields();
    }

    const container = document.getElementById('versesContainer');
    container.innerHTML = '';

    chapter.verses.forEach(verse => {
        const card = document.createElement('div');
        
        // ভূমিকা বা মুখবন্ধ হলে বিশেষ CSS ক্লাস এবং জাস্টিফাই সেট করার লজিক
        if (currentChapter === 'ভূমিকা' || currentChapter === 'মুখবন্ধ') {
            card.className = 'verse-card special-page';
        } else {
            card.className = 'verse-card';
        }
        
        const fullVerse = verse['শ্লোক'] || '';
        card.id = `verse-${fullVerse}`; 

        const verseOnly = fullVerse.includes('-') ? fullVerse.split('-')[1] : fullVerse;
        const formattedVerse = verseOnly.replaceAll('_', ', ');

        // ভূমিকা বা মুখবন্ধ হলে কার্ডে "শ্লোক X" শব্দটি বসবে না
        let html = '';
        if (currentChapter !== 'ভূমিকা' && currentChapter !== 'মুখবন্ধ') {
            html = `<div class="verse-number">শ্লোক ${formattedVerse}</div>`;
        }

        selectedFields.forEach(field => {
            if(verse[field]){
                let extraClass = '';
                let showTitle = true; 
                let content = verse[field];

                if(field === 'সংষ্কৃতম্'){ 
                    extraClass = 'sanskrit'; 
                    showTitle = false; 
                }
                else if(field === 'English Transliteration'){ extraClass = 'english-transliteration'; }
                else if(field === 'English Translation'){ extraClass = 'english-text'; }
                else if(field === 'উচ্চারণ'){ 
                    extraClass = 'bangla-transliteration'; 
                    showTitle = false; 
                }
                else if(field === 'অনুবাদ'){ extraClass = 'bangla-text'; }
                else if(field === 'শব্দার্থ'){ 
                    extraClass = 'word-meanings'; 
                    content = content.split(';').map(part => {
                        if (part.includes('-')) {
                            const index = part.indexOf('-');
                            const word = part.substring(0, index);
                            const meaning = part.substring(index); 
                            return `<strong>${word}</strong>${meaning}`;
                        }
                        return part;
                    }).join(';');
                }
                else if(field.includes('গীতার') && field.includes('গান')){ extraClass = 'gitar-gaan-text'; }
                else if(field.trim() === 'তাৎপর্য'){ extraClass = 'purport-text'; }
                else { extraClass = 'dynamic-' + field.toLowerCase().replace(/[^a-z0-9]/g, '-'); }

                // ভূমিকা বা মুখবন্ধ হলে ফিল্ডের কলাম টাইটেলগুলোও দেখানোর প্রয়োজন নেই
                if (currentChapter === 'ভূমিকা' || currentChapter === 'মুখবন্ধ') {
                    showTitle = false;
                }

                html += `
                    <div class="field">
                        ${showTitle ? `<div class="field-title">${field}</div>` : ''}
                        <div class="field-content ${extraClass}">${content}</div>
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
