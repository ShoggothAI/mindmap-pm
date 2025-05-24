# Linear Issues Viewer

A simple web application that allows you to view your Linear issues in a clean, organized table format using your Linear API token.

## Features

- 🔐 Secure token input (password field)
- 📊 Comprehensive issue display with:
  - Issue ID and title
  - Status with color-coded badges
  - Priority levels
  - Assignee information
  - Team information
  - Creation and update dates
  - Labels with colors
- 🎨 Clean, responsive design
- ⚡ Real-time data fetching from Linear's GraphQL API
- 🔗 Direct links to issues in Linear

## How to Run

### Option 1: Simple File Opening (Recommended)
1. Download or clone this repository
2. Open `index.html` in your web browser
3. Enter your Linear API token and click "Fetch Issues"

### Option 2: Local Web Server
If you encounter CORS issues (unlikely with this setup), you can run a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Getting Your Linear API Token

1. Go to [Linear Settings → API](https://linear.app/settings/api)
2. Click "Create API key"
3. Give it a descriptive name (e.g., "Issues Viewer")
4. Copy the generated token
5. Paste it into the application

## API Permissions

The application only requires read access to your Linear data. It fetches:
- Issues (title, status, priority, assignee, etc.)
- Team information
- Labels
- Basic user information (names)

No data is stored or transmitted anywhere except directly between your browser and Linear's API.

## Security Notes

- Your API token is only stored temporarily in your browser's memory
- The token is never saved to disk or transmitted to any third-party servers
- All communication is directly between your browser and Linear's API over HTTPS
- Consider using a read-only API token for additional security

## Troubleshooting

### "Invalid API token" error
- Double-check that you copied the entire token
- Ensure the token hasn't expired
- Verify you have the necessary permissions in Linear

### "Network error" 
- Check your internet connection
- Ensure Linear's API is accessible from your network
- Try refreshing the page and trying again

### No issues displayed
- Verify you have access to issues in Linear
- Check if your workspace has any issues created
- Ensure your API token has read permissions for issues

## Browser Compatibility

This application works in all modern browsers:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Files Structure

```
├── index.html          # Main HTML file
├── script.js           # JavaScript functionality
├── style.css           # Styling and layout
└── LINEAR_VIEWER_README.md    # This file
```

## Customization

You can easily customize the application by:

1. **Modifying the GraphQL query** in `script.js` to fetch additional fields
2. **Updating the table columns** in `index.html` and corresponding JavaScript
3. **Changing the styling** in `style.css` to match your preferences
4. **Adding filters or search functionality** by extending the JavaScript

## Linear API Documentation

For more information about Linear's API, visit:
- [Linear API Documentation](https://developers.linear.app/docs)
- [GraphQL Playground](https://api.linear.app/graphql)

## License

This project is open source and available under the MIT License.
