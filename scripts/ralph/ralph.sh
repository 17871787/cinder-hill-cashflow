#!/bin/bash
# Ralph for Claude Code
# Usage: ./ralph.sh [max_iterations]

set -e

MAX_ITERATIONS=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
PROMPT_FILE="$SCRIPT_DIR/prompt.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Ralph for Claude Code${NC}"
echo -e "${BLUE}  Max iterations: $MAX_ITERATIONS${NC}"
echo -e "${BLUE}========================================${NC}"

# Check for required files
if [ ! -f "$PRD_FILE" ]; then
    echo -e "${RED}Error: prd.json not found at $PRD_FILE${NC}"
    echo "Create a prd.json with your user stories first."
    exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
    echo -e "${RED}Error: prompt.md not found at $PROMPT_FILE${NC}"
    echo "Create a prompt.md with instructions for each iteration."
    exit 1
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
fi

# Main loop
for ((i=1; i<=MAX_ITERATIONS; i++)); do
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  Iteration $i of $MAX_ITERATIONS${NC}"
    echo -e "${YELLOW}  $(date)${NC}"
    echo -e "${YELLOW}========================================${NC}"

    # Check if all stories are complete
    INCOMPLETE=$(jq '[.userStories[] | select(.passes != true)] | length' "$PRD_FILE")

    if [ "$INCOMPLETE" -eq 0 ]; then
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  ALL STORIES COMPLETE!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo "Completed at: $(date)" >> "$PROGRESS_FILE"
        exit 0
    fi

    echo -e "${BLUE}Remaining stories: $INCOMPLETE${NC}"

    # Run Claude Code with the prompt
    # -p = print mode (non-interactive, exits after response)
    # --dangerously-skip-permissions = auto-approve all tool calls
    echo -e "${BLUE}Running Claude Code...${NC}"

    # Cross-platform: use temp file instead of /dev/stderr (doesn't exist on Windows)
    TEMP_OUTPUT="$SCRIPT_DIR/.ralph-output-$$"
    cat "$PROMPT_FILE" | claude -p --dangerously-skip-permissions 2>&1 | tee "$TEMP_OUTPUT" || true
    OUTPUT=$(cat "$TEMP_OUTPUT")
    rm -f "$TEMP_OUTPUT"

    # Check for completion signal
    if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  RALPH COMPLETE - All stories done!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo "Completed at: $(date)" >> "$PROGRESS_FILE"
        exit 0
    fi

    # Log iteration
    echo "" >> "$PROGRESS_FILE"
    echo "--- Iteration $i completed: $(date) ---" >> "$PROGRESS_FILE"

    # Brief pause between iterations
    sleep 2
done

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Max iterations ($MAX_ITERATIONS) reached${NC}"
echo -e "${YELLOW}========================================${NC}"

# Show remaining stories
echo -e "${YELLOW}Remaining incomplete stories:${NC}"
jq -r '.userStories[] | select(.passes != true) | "  - \(.id): \(.title)"' "$PRD_FILE"
