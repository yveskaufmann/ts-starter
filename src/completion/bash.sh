# bash completion for ts-starter
#
#   source <(ts-starter completion bash)
#
# The suggestions come from `ts-starter __complete`, so new stamps show up without regenerating this script.

_ts_starter() {
  local line=${COMP_LINE:0:COMP_POINT}
  local -a words suggestions
  local current

  # Split the line ourselves, bash splits words at ":" which would cut "app:ts" in two
  read -ra words <<<"$line"
  if [[ $line == *[[:space:]] ]]; then
    words+=("")
  fi
  current=${words[${#words[@]} - 1]}

  mapfile -t suggestions < <(ts-starter __complete "${words[@]:1}" 2>/dev/null)

  COMPREPLY=()
  local suggestion
  for suggestion in "${suggestions[@]}"; do
    if [[ $suggestion == ":files" ]]; then
      compopt -o filenames 2>/dev/null
      mapfile -t -O "${#COMPREPLY[@]}" COMPREPLY < <(compgen -d -- "$current")
    elif [[ -n $suggestion ]]; then
      COMPREPLY+=("$suggestion")
    fi
  done

  # Readline replaces only the text after the last ":", so strip what is already typed up to it
  if [[ $current == *:* ]]; then
    local typed=${current%"${current##*:}"}
    COMPREPLY=("${COMPREPLY[@]#"$typed"}")
  fi
}

complete -F _ts_starter ts-starter
