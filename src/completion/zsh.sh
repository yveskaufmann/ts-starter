#compdef ts-starter

# zsh completion for ts-starter
#
#   source <(ts-starter completion zsh)
#
# The suggestions come from `ts-starter __complete`, so new stamps show up without regenerating this script.

_ts_starter() {
  local -a suggestions
  local -a candidates
  local directive suggestion

  suggestions=("${(@f)$(ts-starter __complete "${(@)words[2,CURRENT]}" 2>/dev/null)}")

  for suggestion in "${suggestions[@]}"; do
    if [[ $suggestion == ":files" ]]; then
      directive=files
    elif [[ -n $suggestion ]]; then
      candidates+=("$suggestion")
    fi
  done

  if (( ${#candidates} )); then
    compadd -Q -- "${candidates[@]}"
  fi
  if [[ $directive == files ]]; then
    _files -/
  fi
}

if [[ $funcstack[1] == _ts_starter ]]; then
  _ts_starter "$@"
else
  compdef _ts_starter ts-starter
fi
