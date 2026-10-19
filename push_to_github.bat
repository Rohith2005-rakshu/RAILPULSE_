@echo off
echo ========================================================
echo        Pushing RailPulse to GitHub Repository
echo ========================================================
echo.
echo Pushing local 'main' branch to:
echo https://github.com/Rohith2005-rakshu/RAILPULSE_
echo.
echo If a GitHub sign-in window opens, please complete the sign-in in your browser.
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo  SUCCESS! Successfully pushed to GitHub:
    echo  https://github.com/Rohith2005-rakshu/RAILPULSE_
    echo ========================================================
) else (
    echo.
    echo If authentication failed, you can also push with a GitHub Personal Access Token:
    echo git push https://YOUR_TOKEN@github.com/Rohith2005-rakshu/RAILPULSE_.git main
)
echo.
pause
