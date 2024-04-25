const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mlm-api', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

// User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  level: { type: Number, default: 0 },
  referEarnings: { type: Number, default: 0 },
  wallet: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);

app.use(bodyParser.json());


// Create a new user
app.post('/users', async (req, res) => {
  const { name, parentId, wallet } = req.body;

  // Validate input
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required and must be a string.' });
  }

  try {
    let parentUser = null;
    if (parentId) {
      parentUser = await User.findById(parentId);
      if (!parentUser) {
        return res.status(400).json({ error: 'Parent user not found.' });
      }
    }

    const newUser = new User({
      name,
      wallet,
      parentId: parentId || null,
      level: parentUser ? parentUser.level + 1 : 0,
    });

    await newUser.save();

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get all users
app.get('/users', async (req, res) => {
    try {
      const allUsers = await User.find();
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

  // Get a single user by ID
app.get('/users/:userId', async (req, res) => {
    const userId = req.params.userId;
  
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error.' });
    }
  });
  



// Distribute referEarnings
app.post('/distribute', async (req, res) => {
  const { userId, amount } = req.body;

  // Validate input
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount.' });
  }

  try {
    const user = await User.findById(userId);
    user.wallet+=amount;
    await user.save();
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Distribute referEarnings according to specified rules
   // const totalreferEarnings = amount * 0.4; // 40% for Level 8 user
    
    const parentUser = await User.findById(user.parentId);
    if (parentUser) {
      const parentreferEarnings = amount * 0.2; // 20% for Level 7 user
      parentUser.referEarnings += parentreferEarnings;
      parentUser.wallet+=parentreferEarnings;
      await parentUser.save();

      const grandParentUser = await User.findById(parentUser.parentId);
      if (grandParentUser) {
        const grandParentreferEarnings = amount * 0.1; // 10% for Level 6 user
        grandParentUser.referEarnings += grandParentreferEarnings;
        grandParentUser.wallet+=grandParentreferEarnings;
        await grandParentUser.save();

        const greatGrandParentUser = await User.findById(grandParentUser.parentId);
        if (greatGrandParentUser) {
          const greatGrandParentreferEarnings = amount * 0.05; // 5% for Level 5 user
          greatGrandParentUser.referEarnings += greatGrandParentreferEarnings;
          greatGrandParentUser.wallet+=greatGrandParentreferEarnings;
          await greatGrandParentUser.save();

          // Distribute the remaining 5% equally among Level 0 to Level 4 users
          const remainingreferEarnings = amount* 0.05;
                
          for (let i = greatGrandParentUser.level-1; i >= greatGrandParentUser.level-5; i--) {
            const levelUser = await User.findOne({ level: i });
            if (levelUser) {
              const levelUserreferEarnings = amount * 0.01; // 1% for each Level 0 to Level 4 user
              levelUser.referEarnings += levelUserreferEarnings;
              levelUser.wallet+=levelUserreferEarnings;
              await levelUser.save();
            }
          }
        }
      }
    }

    res.json({ message: 'referEarnings distributed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});




  
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
