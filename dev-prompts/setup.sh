mkdir -vp ~/Library/Application\ Support/Code/User/prompts || true
rm ~/Library/Application\ Support/Code/User/prompts/ralph.prompt.md || true
ln -s $HOME/workspace/namuan/dev-prompts/ralph.prompt.md ~/Library/Application\ Support/Code/User/prompts/ralph.prompt.md
rm ~/.local/bin/ralph || true
ln -s $HOME/workspace/namuan/dev-prompts/ralph.sh ~/.local/bin/ralph
