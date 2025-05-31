# Check for Homebrew,
# Install if we don't have it
if test ! $(which brew); then
  echo "Installing homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Update homebrew recipes
echo "Updating homebrew..."
brew update

echo "Installing Git..."
brew install git

echo "Git config"

git config --global user.name "namuan"
git config --global user.email 575441+namuan@users.noreply.github.com

echo "Installing brew git utilities..."
brew install git-extras

echo "Installing other brew stuff..."
tools=(
  tree
  wget
  gron
  jq
  sd
  ripgrep
  fzf
  imagemagick
  pandoc
  shellcheck
  graphviz
  git-lfs
  plantuml
  cookiecutter
  yt-dlp
  universal-ctags
  bat
  chromedriver
  fd
  yarn
  pdm
  duckdb
  uv
  jless
)
brew install "${tools[@]}"

# Setup fonts
brew install cask font-fira-code font-jetbrains-mono font-input

#Install Zsh & Oh My Zsh
if test ! $(which zsh); then
  echo "Installing Oh My ZSH..."
  curl -L http://install.ohmyz.sh | sh

  # jump using j
  brew install autojump

  echo "Setting up Zsh plugins..."
  cd ~/.oh-my-zsh/custom/plugins
  git clone git://github.com/zsh-users/zsh-syntax-highlighting.git
  git clone https://github.com/zsh-users/zsh-autosuggestions
  git clone https://github.com/zsh-users/zsh-completions
  git clone https://github.com/nojhan/liquidprompt.git

  echo "Setting ZSH as shell..."
  chsh -s /bin/zsh
fi

# Apps
apps=(
  diffmerge
  keepingyouawake
  spectacle
  textmate
  inkscape
)

echo "installing apps with Cask..."
brew install cask "${apps[@]}"

# Install Apps once as they manage the updates themselves
test -d "$HOME/Applications/JetBrains Toolbox.app" || brew install --cask jetbrains-toolbox
test -d "$HOME/Applications/Vivaldi.app" || brew install --cask vivaldi
test -d "$HOME/Applications/Alfred 5.app" || brew install --cask alfred
test -d "$HOME/Applications/Setapp.app" || brew install --cask setapp
test -d "$HOME/Applications/Telegram.app" || brew install --cask telegram
test -d "$HOME/Applications/draw.io.app" || brew install --cask drawio
test -d "$HOME/Applications/iTerm.app" || brew install --cask iterm2

Echo "Installing SDKMan for managing anything JVM"
curl -s "https://get.sdkman.io" | bash

echo "Installing NodeJS"
brew install node

# shellcheck disable=SC2046
test ! $(which npm) && npm install -g npx
test ! $(which pnpm) && npm install -g pnpm

echo "Installing GoLang"
brew install go

echo "Installing Rust"
brew install rust

echo "Installing Python"
brew install python@3.8
brew install python-tk@3.8

brew install python@3.9
brew install python-tk@3.9

brew install python@3.10
brew install python-tk@3.10

brew install python@3.11
brew install python-tk@3.11

brew install python@3.12
brew install python-tk@3.12

brew install python@3.13
brew install python-tk@3.13

echo "Installing Poetry"
brew install poetry

echo "Manim dependencies"
brew install py3cairo ffmpeg pango scipy
brew install cask mactex-no-gui

echo "Cleaning up brew"
brew cleanup

echo "Clone snippets-lib"
echo "ln -s "

echo "Symlink zsh files"
rm $HOME/.zshrc
ln -s $PWD/zshrc $HOME/.zshrc

rm $HOME/.zsh_paths
ln -s $PWD/zsh_paths $HOME/.zsh_paths

rm $HOME/shell_shortcuts
ln -s $PWD/shell_shortcuts.sh $HOME/shell_shortcuts

# Global GitIgnore
rm $HOME/.gitignore
ln -s $PWD/.gitignore $HOME/.gitignore
git config --global core.excludesFile "$HOME/.gitignore"

# Bin folder
mkdir -vp $HOME/bin
for file in $PWD/home-bin/*; do
  echo "Symlinking $file"
  ln -s $file $HOME/bin
done

echo "Done"
