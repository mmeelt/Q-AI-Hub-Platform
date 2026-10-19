#!/usr/bin/env bash
# One clean run of the browser cases on one browser: empty test database, fresh inbox, then the tests.
# Usage: run_suite.sh chrome|edge
BROWSER="${1:-chrome}"
E="$(cd "$(dirname "$0")" && pwd)"
PY="${PYTHON:-python}"   # a Python with: pip install -r requirements.txt

stop_backend() {
  pid=$(netstat -ano | grep ":8082 .*LISTENING" | awk '{print $5}' | head -1)
  [ -n "$pid" ] && taskkill //F //PID "$pid" >/dev/null 2>&1
}

stop_backend
rm -rf "$E/state.json" "$E/mails"/* "$E/uploads" "$E"/TC1*_*.txt
mkdir -p "$E/reports" "$E/screenshots"
rm -f "$E/screenshots/$BROWSER-"*

bash "$E/start_test_backend.sh" &
for i in $(seq 1 120); do
  grep -q "Started CompetitionPlatformApplication" "$E/backend-test.log" 2>/dev/null && break
  grep -q "APPLICATION FAILED\|BUILD FAILURE" "$E/backend-test.log" 2>/dev/null && { echo "backend failed"; exit 1; }
  sleep 2
done
# Safety: never run against anything but the throwaway H2 database
grep -q "url=jdbc:h2:mem:e2e" "$E/backend-test.log" || { echo "not on H2 - aborting"; stop_backend; exit 1; }

cd "$E" && "$PY" -m pytest -v -s test_01_maram.py test_02_mariem.py test_03_systeme_acceptation.py \
  -p no:cacheprovider --tb=short --browser="$BROWSER" --junitxml="reports/selenium-$BROWSER.xml" > "reports-$BROWSER.log" 2>&1
status=$?
stop_backend
grep -E "[0-9]+ (passed|failed)" "reports-$BROWSER.log"
exit $status
