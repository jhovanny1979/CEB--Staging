
    if (location.protocol === 'file:') {
      const page = location.pathname.split('/').pop() || 'index.html';
      const target = 'http://127.0.0.1:5500/' + page + location.search + location.hash;
      location.replace(target);
    }
  