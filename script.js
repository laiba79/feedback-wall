document.addEventListener('DOMContentLoaded', () => {
  const feedbackContent = document.getElementById('feedback-content');
  const feedbackAuthor = document.getElementById('feedback-author');
  const feedbackCategory = document.getElementById('feedback-category');
  const submitBtn = document.getElementById('submit-feedback');
  const feedbackList = document.getElementById('feedback-list');
  const sortBy = document.getElementById('sort-by');
  const filterCategory = document.getElementById('filter-category');
  const loginBtn = document.getElementById('login-btn');
  const loginModal = document.getElementById('login-modal');
  const closeModal = document.querySelector('.close-modal');
  const loginForm = document.getElementById('login-form');
  const googleLoginBtn = document.querySelector('.btn-outline');
  const themeToggle = document.getElementById('theme-toggle');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const formatBtns = document.querySelectorAll('.format-btn');
  const socket = io();
  
  let feedbacks = [];
  let currentUser = null;

  const currentTheme = localStorage.getItem('theme') || (prefersDarkScheme.matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);

  themeToggle.addEventListener('click', () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });

  prefersDarkScheme.addEventListener('change', e => {
    const newTheme = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }

  loadFeedbacks();
  setupEventListeners();

  function loadFeedbacks() {
    fetch('/api/feedback')
      .then(res => res.json())
      .then(data => {
        feedbacks = data;
        renderFeedbacks();
      })
      .catch(err => {
        console.error('Error loading feedback:', err);
        showToast('Failed to load feedback. Please try again.', 'error');
      });
  }

  function renderFeedbacks() {
    feedbackList.innerHTML = '';
    
    if (feedbacks.length === 0) {
      feedbackList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comment-slash"></i>
          <p>No feedback yet. Be the first to share your thoughts!</p>
        </div>
      `;
      return;
    }
    
    let filteredFeedbacks = [...feedbacks];
    
    if (filterCategory.value !== 'all') {
      filteredFeedbacks = filteredFeedbacks.filter(fb => fb.category === filterCategory.value);
    }
    
    switch (sortBy.value) {
      case 'newest':
        filteredFeedbacks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filteredFeedbacks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'votes':
        filteredFeedbacks.sort((a, b) => b.votes - a.votes);
        break;
    }
    
    filteredFeedbacks.forEach(feedback => {
      const feedbackItem = document.createElement('div');
      feedbackItem.className = 'feedback-item';
      
      let formattedContent = feedback.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      
      feedbackItem.innerHTML = `
        <div class="feedback-content">${formattedContent}</div>
        <div class="feedback-meta">
          <div>
            <span class="feedback-author">${feedback.author || 'Anonymous'}</span>
            <span class="feedback-category">${feedback.category}</span>
            <span class="feedback-date">${formatDate(feedback.createdAt)}</span>
          </div>
          <div class="feedback-votes">
            <button class="vote-btn upvote" data-id="${feedback._id}" title="Upvote">
              <i class="fas fa-arrow-up"></i>
            </button>
            <span class="vote-count">${feedback.votes}</span>
            <button class="vote-btn downvote" data-id="${feedback._id}" title="Downvote">
              <i class="fas fa-arrow-down"></i>
            </button>
          </div>
        </div>
      `;
      
      feedbackList.appendChild(feedbackItem);
    });
    
    document.querySelectorAll('.upvote').forEach(btn => btn.addEventListener('click', handleVote));
    document.querySelectorAll('.downvote').forEach(btn => btn.addEventListener('click', handleVote));
  }

  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  function handleSubmitFeedback() {
    const content = feedbackContent.value.trim();
    const author = feedbackAuthor.value.trim() || 'Anonymous';
    const category = feedbackCategory.value;
    
    if (!content) {
      showToast('Please enter your feedback', 'warning');
      feedbackContent.focus();
      return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
    
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, author, category })
    })
    .then(res => res.json())
    .then(data => {
      feedbackContent.value = '';
      feedbackAuthor.value = '';
      showToast('Feedback submitted successfully!', 'success');
    })
    .catch(err => {
      console.error('Error submitting feedback:', err);
      showToast('Failed to submit feedback. Please try again.', 'error');
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Feedback';
    });
  }

  function handleVote(e) {
    const feedbackId = e.target.closest('.vote-btn').dataset.id;
    const direction = e.target.closest('.vote-btn').classList.contains('upvote') ? 'up' : 'down';
    const voteBtn = e.target.closest('.vote-btn');
    
    voteBtn.disabled = true;
    
    fetch(`/api/feedback/${feedbackId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction })
    })
    .then(res => res.json())
    .then(data => {
      voteBtn.classList.add(direction === 'up' ? 'upvoted' : 'downvoted');
      setTimeout(() => voteBtn.classList.remove('upvoted', 'downvoted'), 1000);
    })
    .catch(err => {
      console.error('Error voting:', err);
      showToast('Failed to register vote. Please try again.', 'error');
    })
    .finally(() => voteBtn.disabled = false);
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  function setupEventListeners() {
    submitBtn.addEventListener('click', handleSubmitFeedback);
    
    feedbackContent.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') handleSubmitFeedback();
    });
    
    formatBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const format = btn.dataset.format;
        const start = feedbackContent.selectionStart;
        const end = feedbackContent.selectionEnd;
        const selectedText = feedbackContent.value.substring(start, end);
        
        let formattedText = '';
        switch (format) {
          case 'bold': formattedText = `**${selectedText}**`; break;
          case 'italic': formattedText = `*${selectedText}*`; break;
          case 'link':
            const url = prompt('Enter URL:');
            if (url) {
              const linkText = selectedText || 'link';
              formattedText = `[${linkText}](${url})`;
            } else return;
            break;
        }
        
        feedbackContent.setRangeText(formattedText, start, end, 'end');
        feedbackContent.focus();
      });
    });
    
    sortBy.addEventListener('change', renderFeedbacks);
    filterCategory.addEventListener('change', renderFeedbacks);
    
    loginBtn.addEventListener('click', () => {
      loginModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
    
    closeModal.addEventListener('click', () => {
      loginModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    });
    
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        loginModal.style.display = 'none';
        document.body.style.overflow = 'auto';
      }
    });
    
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      
      if (!username || !password) {
        showToast('Please fill in all fields', 'warning');
        return;
      }
      
      currentUser = username.split('@')[0] || 'User';
      loginBtn.textContent = `Hi, ${currentUser}`;
      loginModal.style.display = 'none';
      document.body.style.overflow = 'auto';
      showToast(`Welcome back, ${currentUser}!`, 'success');
    });
    
    googleLoginBtn.addEventListener('click', () => {
      showToast('Google login would be implemented here', 'info');
    });
    
    if (socket) {
      socket.on('new-feedback', (feedback) => {
        feedbacks.unshift(feedback);
        renderFeedbacks();
        if (currentUser && feedback.author !== currentUser) {
          showToast(`New feedback from ${feedback.author || 'Anonymous'}`, 'info');
        }
      });
      
      socket.on('vote-update', ({ id, votes }) => {
        const feedback = feedbacks.find(fb => fb._id === id);
        if (feedback) {
          feedback.votes = votes;
          renderFeedbacks();
        }
      });
    }
  }
});