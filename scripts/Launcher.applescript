set d to POSIX path of (path to desktop folder)
set repo to d & "ScribeCat"
do shell script "cd " & quoted form of repo & "; export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.cargo/bin:$HOME/.volta/bin:$HOME/.nvm/versions/node/current/bin:$PATH; nohup /bin/bash scripts/launch_refresh.sh >/dev/null 2>&1 &"
