

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
)
brew install "${tools[@]}"

echo "Installing homebrew cask"
# This may be required ? brew install --cask caskroom/cask/brew-cask

brew tap homebrew/cask-fonts
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
alfred
diffmerge
iterm2
vivaldi
keepingyouawake
drawio
telegram
visual-studio-code
spectacle
jetbrains-toolbox
textmate
setapp
inkscape
)

echo "installing apps with Cask..."
brew install cask "${apps[@]}"

Echo "Installing SDKMan for managing anything JVM"
curl -s "https://get.sdkman.io" | bash

echo "Installing NodeJS"
brew install node
# shellcheck disable=SC2046
test ! $(which npm) && npm install -g npx

echo "Installing Python"
brew install python@3.8
brew install python@3.9
brew install python@3.10
brew install python@3.11

echo "Installing Poetry"
curl -sSL https://install.python-poetry.org | python3 -

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

echo "Done"
