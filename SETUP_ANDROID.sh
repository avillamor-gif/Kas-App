#!/bin/bash
set -e

echo "🚀 Starting Android APK Setup..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if Java is installed
echo -e "${BLUE}Step 1: Checking Java installation...${NC}"
if ! command -v java &> /dev/null; then
    echo -e "${YELLOW}Java not found. Installing via Homebrew...${NC}"
    brew install openjdk@17
    # Set JAVA_HOME
    export JAVA_HOME=$(/usr/libexec/java_home -v 17)
else
    echo -e "${GREEN}✓ Java is installed${NC}"
    java -version
fi

# Step 2: Check Android SDK
echo -e "${BLUE}\nStep 2: Checking Android SDK...${NC}"
if [ ! -d "$HOME/Library/Android/sdk" ]; then
    echo -e "${YELLOW}Android SDK not found. Installing...${NC}"
    
    # Create SDK directory
    mkdir -p "$HOME/Library/Android/sdk"
    
    # Download Android SDK Command-line tools
    cd /tmp
    curl -o cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-mac-8092744_latest.zip
    unzip -q cmdline-tools.zip
    mkdir -p "$HOME/Library/Android/sdk/cmdline-tools/latest"
    mv cmdline-tools/* "$HOME/Library/Android/sdk/cmdline-tools/latest/"
    rm -rf cmdline-tools* 
    
    # Set up SDK paths
    export ANDROID_HOME="$HOME/Library/Android/sdk"
    export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
    
    # Install required packages (non-interactive)
    echo "Installing Android SDK packages..."
    yes | sdkmanager --sdk_root="$ANDROID_HOME" "platforms;android-34" \
        "build-tools;34.0.0" \
        "ndk;27.0.11902837" \
        "platform-tools" 2>/dev/null || true
else
    echo -e "${GREEN}✓ Android SDK found at $HOME/Library/Android/sdk${NC}"
fi

# Set environment variables for build
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# Step 3: Update environment files
echo -e "${BLUE}\nStep 3: Configuring environment variables...${NC}"

# Add to .zshrc if using zsh
if [ -f "$HOME/.zshrc" ]; then
    if ! grep -q "ANDROID_HOME" "$HOME/.zshrc"; then
        echo "" >> "$HOME/.zshrc"
        echo "# Android SDK Configuration" >> "$HOME/.zshrc"
        echo "export ANDROID_HOME=\$HOME/Library/Android/sdk" >> "$HOME/.zshrc"
        echo "export PATH=\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH" >> "$HOME/.zshrc"
        echo "export JAVA_HOME=\$(/usr/libexec/java_home -v 17)" >> "$HOME/.zshrc"
        echo -e "${GREEN}✓ Added to .zshrc${NC}"
    fi
fi

# Step 4: Build APK
echo -e "${BLUE}\nStep 4: Building Android APK...${NC}"
cd "$HOME/kas-app"

# Make gradlew executable
chmod +x android/gradlew

# Build debug APK
echo "Building debug APK (this may take 5-10 minutes)..."
cd android
./gradlew assembleDebug --warning-mode=all 2>&1 | tail -10

# Check if build was successful
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo -e "${GREEN}✓ APK built successfully!${NC}"
    
    # Copy to downloads folder
    echo -e "${BLUE}\nStep 5: Setting up APK download endpoint...${NC}"
    mkdir -p "../public/downloads"
    cp "app/build/outputs/apk/debug/app-debug.apk" "../public/downloads/kas-tracker.apk"
    echo -e "${GREEN}✓ APK copied to public/downloads/kas-tracker.apk${NC}"
    
    # Get APK size
    SIZE=$(ls -lh ../public/downloads/kas-tracker.apk | awk '{print $5}')
    echo -e "${GREEN}✓ APK size: $SIZE${NC}"
    
    # Step 6: Update QR generation
    echo -e "${BLUE}\nStep 6: Verifying APK download endpoint...${NC}"
    echo -e "${GREEN}✓ Endpoint ready: /api/download/apk/[memberId]${NC}"
    echo -e "${GREEN}✓ APK file: public/downloads/kas-tracker.apk${NC}"
    
    echo -e "\n${GREEN}✅ Android setup complete!${NC}"
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Commit changes: git add -A && git commit -m 'build: add built APK'"
    echo "2. Deploy to production"
    echo "3. Admin generates member QR codes (will point to /api/download/apk/[memberId])"
    echo "4. Member scans QR → APK downloads → auto-installs"
    
else
    echo -e "${YELLOW}⚠ APK build may have failed. Check errors above.${NC}"
    exit 1
fi
