#!/bin/bash

# VolxAI Backend Startup Script
# Place this in your /api directory on the server

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/api"
APP_FILE="node-build.mjs"
LOG_DIR="/api/logs"
LOG_FILE="$LOG_DIR/server.log"
PID_FILE="/api/.pid"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to start the server
start_server() {
    echo -e "${YELLOW}Starting VolxAI Backend Server...${NC}"
    
    # Check if server is already running
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if kill -0 "$OLD_PID" 2>/dev/null; then
            echo -e "${RED}Server is already running (PID: $OLD_PID)${NC}"
            return 1
        fi
    fi
    
    # Start the server in the background
    cd "$APP_DIR"
    nohup node "$APP_FILE" >> "$LOG_FILE" 2>&1 &
    NEW_PID=$!
    
    # Save PID
    echo $NEW_PID > "$PID_FILE"
    
    # Wait a moment for the server to start
    sleep 2
    
    # Check if process is still running
    if kill -0 "$NEW_PID" 2>/dev/null; then
        echo -e "${GREEN}✓ Server started successfully (PID: $NEW_PID)${NC}"
        echo -e "${GREEN}  Log file: $LOG_FILE${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to start server${NC}"
        echo -e "${YELLOW}Check logs: tail -f $LOG_FILE${NC}"
        return 1
    fi
}

# Function to stop the server
stop_server() {
    echo -e "${YELLOW}Stopping VolxAI Backend Server...${NC}"
    
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${RED}Server is not running${NC}"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        sleep 1
        
        if ! kill -0 "$PID" 2>/dev/null; then
            echo -e "${GREEN}✓ Server stopped successfully${NC}"
            rm -f "$PID_FILE"
            return 0
        else
            echo -e "${RED}✗ Failed to stop server (forcing)${NC}"
            kill -9 "$PID"
            rm -f "$PID_FILE"
            return 0
        fi
    else
        echo -e "${RED}Server is not running${NC}"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Function to check status
status_server() {
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${YELLOW}Server is not running${NC}"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "${GREEN}✓ Server is running (PID: $PID)${NC}"
        echo -e "${GREEN}  Log file: $LOG_FILE${NC}"
        return 0
    else
        echo -e "${RED}✗ Server is not running${NC}"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Function to view logs
view_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        echo -e "${RED}Log file not found: $LOG_FILE${NC}"
        return 1
    fi
    tail -f "$LOG_FILE"
}

# Function to restart
restart_server() {
    stop_server
    sleep 1
    start_server
}

# Parse command
case "${1:-start}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        status_server
        ;;
    logs)
        view_logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the server"
        echo "  stop    - Stop the server"
        echo "  restart - Restart the server"
        echo "  status  - Check server status"
        echo "  logs    - View live logs"
        exit 1
        ;;
esac

exit $?
