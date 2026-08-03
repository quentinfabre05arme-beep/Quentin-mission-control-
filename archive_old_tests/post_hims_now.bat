@echo off
echo ========================================
echo  POST HIMS THREAD - Semi-Automated
echo ========================================
echo.

REM Check if Chrome is running
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I /N "chrome.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo [INFO] Starting Chrome...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe"
    timeout /t 4 /nobreak >NUL
)

echo [STEP 1] Opening X compose page...
start "" "https://x.com/compose/tweet"
timeout /t 3 /nobreak >NUL

echo.
echo ========================================
echo  MANUAL STEPS (30 seconds)
echo ========================================
echo.
echo 1. Switch to Chrome browser
echo 2. Press F12 to open DevTools
echo 3. Click Console tab
echo 4. Copy the JavaScript below:
echo.
echo ----------------------------------------
echo.
echo /* Paste this entire code into Console */
echo (async function() {
echo   const tweets = [
echo     "The GLP-1 revolution is here.^^But the real play isn't the drugs - it's the infrastructure delivering them.^^HIMS is quietly building the rails for healthcare's biggest transformation. ^^(Thread 🧵)",
echo     "Most people think HIMS is just a telehealth app.^^They're wrong.^^HIMS is healthcare infrastructure - the picks and shovels of the GLP-1 gold rush.",
echo     "The numbers prove it:^^• $725M revenue in 2024^^• 2.5M+ subscribers^^• Partnership with Novo Nordisk^^• 87%% gross margins^^This isn't a startup. It's infrastructure at scale.",
echo     "While GLP-1 makers fight for market share,^^HIMS extracts value from ALL sides:^^• Patients get access^^• Doctors get patients^^• Pharmacies get volume^^• Insurers get efficiency^^Platform economics at work.",
echo     "The market is waking up.^^HIMS is down from $25 to $12, creating an entry point for patient investors.^^But this isn't about catching a falling knife.^^It's about recognizing infrastructure before the market does.",
echo     "What makes HIMS different?^^They own the relationship.^^Not the drug. Not the pharmacy.^^The patient relationship.^^That's the enduring value in healthcare delivery."
echo   ];
echo   
echo   for (let i = 0; i ^< tweets.length; i++) {
echo     const textarea = document.querySelector(`[data-testid="tweetTextarea_${i}"]`);
echo     if (textarea) {
echo       textarea.focus();
echo       textarea.innerHTML = tweets[i];
echo       textarea.textContent = tweets[i];
echo       const event = new InputEvent('input', { bubbles: true });
echo       textarea.dispatchEvent(event);
echo       await new Promise(r => setTimeout(r, 500));
echo     }
echo     if (i ^< tweets.length - 1) {
echo       const addBtn = document.querySelector('[data-testid="addButton"]');
echo       if (addBtn) addBtn.click();
echo       await new Promise(r => setTimeout(r, 500));
echo     }
echo   }
echo   
echo   await new Promise(r => setTimeout(r, 1000));
echo   const postBtn = document.querySelector('[data-testid="tweetButton"]');
echo   if (postBtn && !postBtn.disabled) {
echo     postBtn.click();
echo     console.log('✅ Thread posted!');
echo   } else {
echo     console.log('⚠️ Post button disabled - check character counts');
echo   }
echo })();
echo.
echo ----------------------------------------
echo.
echo 5. Paste into DevTools Console
echo 6. Press Enter
echo 7. Thread posts automatically!
echo.
echo ========================================
pause
