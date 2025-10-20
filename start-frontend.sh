#!/bin/bash
cd "/Users/ev/opt/ oko-znanii/frontend-react"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use
npm run dev
#Если настроен автозагрузка nvm в shell (добавьте в ~/.zshrc




