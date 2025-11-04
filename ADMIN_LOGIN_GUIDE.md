# How to Login as Admin

## Method 1: Register as Admin (Recommended)

1. **Go to the Homepage** (`http://localhost:5173` or `http://localhost:5174`)

2. **Click "Sign Up"** button in the navbar

3. **Fill in the registration form:**
   - Name: Your name
   - Email: Your email address
   - Role: **Select "Admin"** from the dropdown
   - Password: Your password (minimum 6 characters)
   - Confirm Password: Same password

4. **Click "Create Account"**

5. You will be automatically logged in and redirected to `/admin`

## Method 2: Register via /register page

1. **Navigate to** `http://localhost:5173/register` or `http://localhost:5174/register`

2. **Fill in the form** and select **"Admin"** as the role

3. **Submit** and you'll be redirected to the Admin Panel

## Method 3: Update Existing User to Admin (if you have another admin)

If you already have an admin account, you can:

1. **Login as that admin**
2. **Go to** `/admin` page
3. **Find the user** in the User Management table
4. **Change their role** to "Admin" using the dropdown
5. **That user can now login** and will have admin access

## Method 4: Direct Database Access (Advanced)

If you have MongoDB access, you can directly update a user:

```javascript
// In MongoDB shell or Compass
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

## Login Credentials Example

After registering as admin:

- **Email**: The email you used during registration
- **Password**: The password you set during registration

## Accessing Admin Panel

Once logged in as admin, you'll be automatically redirected to:
- `/admin` - Admin Panel with:
  - User Management
  - System Health Monitoring
  - Model Status
  - API Logs
  - Model Retraining

## Troubleshooting

### Can't see Admin option in registration?
- Make sure you're using the latest code
- Refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Check browser console for errors

### Registration fails?
- Ensure MongoDB is running
- Check server logs for errors
- Verify email isn't already registered

### Admin role not working?
- Check if user role is actually "admin" in database
- Clear browser localStorage and try again
- Verify JWT token includes admin role

