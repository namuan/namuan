# +++++ Define Aliases

alias ll='ls -lh -G'
alias git_sort_by_checkins="git for-each-ref --sort=-committerdate refs/heads/ --format='%(refname:short) %(committerdate:short) %(authorname)'"

# Aliases for projects
alias work="cd ~/workspace"
alias dircopy="pwd | tr -d '\n' | pbcopy"
alias catfile="cat << EOF > "

# Aliases for git
alias g="git"
alias gcl="git clone"
alias gs="git status"
alias gpa="git pull --all"
alias gpr="git pull --rebase"
alias gc="git commit -m"
alias ga="git add"
alias grc="git rebase --continue"
alias gp="git push"
alias gdi="git diff"
alias gds="git diff --staged"
alias gl="git log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit --date=relative"
alias gsh="git stash"
alias gsp="git stash pop"
alias gr="git reset"
alias gpa="git pull --all"

alias urldecode='python -c "import sys, urllib as ul; print ul.unquote_plus(sys.argv[1])"'
alias urlencode='python -c "import sys, urllib as ul; print ul.quote_plus(sys.argv[1])"'

alias gcod="gco develop"
alias gcom="gco master"

alias mr="make run"
alias mt="make test"
alias py="./venv/bin/python3"
alias pyvenv="python3 -m venv venv"
alias svenv="source venv/bin/activate"

# ----- Define Aliases


# +++++ Define custom bash functions

function pingme() {
  osascript -e 'display notification "Command finished" with title "Ping"'
}

function alert() {
  osascript -e 'tell app "System Events" to display dialog "Job done"'
}

function tardir() {
  DIR=${1}
  tar zcvf $DIR.tar.gz $DIR
}


function ktx() {
  kubectl config use-context `kubectl config get-contexts --output='name' | fzf`
}

##
# Quickly starts a webserver from the current directory.
#
# Thanks to:
# http://superuser.com/questions/52483/terminal-tips-and-tricks-for-mac-os-x
#
# @param [optional, Integer] bind port number, default 8000
function serve() {
  $(which python3) -m http.server ${1:-8000}
}

function f() { find . -iname "*$1*" ;}
function ffind() { f "$1" | xargs ack --noheading "$2" ;}
function fopen() { f "$1" | fzf | xargs subl ;}
function psgrep() { pstree  | grep -v grep | grep "$@" ;}
function fnote() { grep "$@" ~/notes.txt ;}
function pskill() { ps -ef | grep "$@" | awk '{print "kill -9 "$2}' | sh ;}
function h() { history | grep "$@" ;}

# Visual Studio Code
code () { VSCODE_CWD="$PWD" open -n -b "com.microsoft.VSCode" --args $* ;}

function cht() {
	curl -s https://cht.sh/"$1" | less
}

function dockerrmi() {
  docker images | grep "$1" | awk '{print "docker rmi --force "$3}' | sh
}

function set_node_proxy() {
  PORT=$1
  export NODE_TLS_REJECT_UNAUTHORIZED=0; export https_proxy=http://localhost:${PORT}; export http_proxy=http://localhost:${PORT};
}

function unset_node_proxy() {
  unset NODE_TLS_REJECT_UNAUTHORIZED; unset https_proxy; unset http_proxy;
}

# Create backup copy of file, adding suffix of the date of the file modification (NOT today's date)
function backup_file() {
  local FILE=$1
  cp ${FILE}{,.$(date -r ${FILE} "+%y%m%d")}
}

function diff_dirs() {
  local DIR_1=$1
  local DIR_2=$2
  diff --side-by-side --suppress-common-lines <(tree ${DIR_1}) <(tree ${DIR_2})
}

# Search all directories for this directory name.
function dname() {
  [ $# -eq 0 ] && echo "$0 'dir_name'" && return 1
  fd --hidden --follow --exclude .git --type directory "$*"
}

# Search all files for this filename.
function fname() {
  [ $# -eq 0 ] && echo "$0 'file_name'" && return 1
  fd --hidden --follow --exclude .git --type file "$*"
}

function json2yaml() {
  python3 -c "import json,sys,yaml; print(yaml.dump(json.load(sys.stdin)))"
}

function yaml2json() {
  python3 -c "import json,sys,yaml; json.dump(yaml.safe_load(sys.stdin), sys.stdout, default=str)"
}

# ----- Define custom bash functions

PROMPT=$'%{$fg[white]%} %{$fg_bold[cyan]%}%~%{$reset_color%}$(git_prompt_info) %{$fg[cyan]%}%D{[%I:%M:%S]}\
%{$fg_bold[green]%}$%{$reset_color%} '
