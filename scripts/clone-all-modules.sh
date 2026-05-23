#!/bin/bash
MODULES=(ptw incidentmanagement safetyobservation inspection tbt inductiontraining jobtraining worker manpower mom chatbox quality environment attendance permissions voice_translator ai_bot)

for module in "${MODULES[@]}"; do
    ./scripts/clone-module.sh "$module"
done

echo "All modules cloned"
