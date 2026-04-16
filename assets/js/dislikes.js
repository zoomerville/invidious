(async function () {
	const response = await fetch(`/api/dislikes?videoId=${encodeURIComponent(video_data.id)}`);    
    const {likes, dislikes} = await response.json();
	const percent = likes === dislikes ? 50 : (likes / (likes + dislikes))  * 100;

	const eLikes = document.querySelector('#likes');
	eLikes.style.display = 'none';
	const rating = createElement('div', eLikes, 'after')
		.setClass('rating-box');
	
	createElement('i', rating)
		.setClass('icon ion-ios-thumbs-up')

	createElement('span', rating)
		.setClass('rating-likes')
		.setText(likes.toLocaleString('en-US'));
	
	createElement('i', rating)
		.setClass('icon ion-ios-thumbs-down')
	
	createElement('span', rating)
		.setClass('rating-dislikes')
		.setText(dislikes.toLocaleString('en-US'));

	const bar = createElement('span', rating)
		.setClass('rating-bar');
	
		bar.style.background = `linear-gradient(to right, #0F0 0%, #0F0 ${percent}%, #F00 ${percent}%, #F00 100%)`;
})();