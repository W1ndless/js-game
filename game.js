'use strict';

class Vector {
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	plus(vector) {
		if (!(vector instanceof Vector)) {
			throw Error('Можно прибавлять к вектору только вектор типа Vector');
		}
		return new Vector(this.x + vector.x, this.y + vector.y);
	}

	times(multiplier) {
		return new Vector(this.x * multiplier, this.y * multiplier);
	}
}

class Actor {
	constructor(
		pos = new Vector(0, 0),
		size = new Vector(1, 1),
		speed = new Vector(0, 0)
	) {
		if (
			!(pos instanceof Vector) ||
			!(size instanceof Vector) ||
			!(speed instanceof Vector)
		) {
			throw Error('В Actor можно передавать только объекты типа Vector');
		}

		this.pos = pos;
		this.size = size;
		this.speed = speed;
	}

	act() {}

	get left() {
		return this.pos.x;
	}

	get top() {
		return this.pos.y;
	}

	get right() {
		return this.pos.x + this.size.x;
	}

	get bottom() {
		return this.pos.y + this.size.y;
	}

	get type() {
		return 'actor';
	}

	isIntersect(actor) {
		if (!(actor instanceof Actor)) {
			throw new Error('actor is not instanceof Actor');
		}

		if (actor === this) {
			return false;
		}

		if (
			this.left === actor.right ||
			this.right === actor.left ||
			this.top === actor.bottom ||
			this.bottom === actor.top
		) {
			return false;
		}

		if (
			(this.left === actor.left ||
				this.right === actor.right ||
				this.top === actor.top ||
				this.bottom === this.bottom) &&
			actor.bottom < 0 &&
			actor.right < 0
		) {
			return false;
		}

		return (
			(((this.left >= actor.left && this.left <= actor.right) ||
				(this.right >= actor.left && this.right <= actor.right)) &&
				((this.top >= actor.top && this.top <= actor.bottom) ||
					(this.bottom >= actor.top && this.bottom <= actor.bottom))) ||
			(((actor.left >= this.left && actor.left <= this.right) ||
				(actor.right >= this.left && actor.right <= this.right)) &&
				((actor.top >= this.top && actor.top <= this.bottom) ||
					(actor.bottom >= this.top && actor.bottom <= this.bottom))) ||
			((((this.left >= actor.left && this.left <= actor.right) ||
				(this.right >= actor.left && this.right <= actor.right)) &&
				((this.top >= this.top && actor.top <= this.bottom) ||
					(actor.bottom >= this.top && actor.bottom <= this.bottom))) ||
				(((this.left >= this.left && actor.left <= this.right) ||
					(actor.right >= this.left && actor.right <= this.right)) &&
					((this.top >= actor.top && this.top <= actor.bottom) ||
						(this.bottom >= actor.top && this.bottom <= actor.bottom))))
		);
	}
}

class Level {
	constructor(grid, actors) {
		this._grid = grid || [];
		this.actors = actors || [];

		this.actors.forEach(actor => {
			if (actor.type === 'player') {
				this._player = actor;
			}
		});

		this.status = null;
		this.finishDelay = 1;
	}

	get grid() {
		return this._grid;
	}

	set grid(newValue) {
		this._grid = newValue;
	}

	get player() {
		return this._player;
	}

	get height() {
		return this.grid.length;
	}

	get width() {
		let rowWidths = this.grid.map(row => {
			return row.length;
		});

		return rowWidths.length === 0 ? 0 : Math.max(...rowWidths);
	}

	isFinished() {
		if (this.status !== null && this.finishDelay < 0) return true;
		return false;
	}

	actorAt(player) {
		if (player === undefined || !(player instanceof Actor)) {
			throw new Error(
				'В метод actorAt не передан движущийся объект типа Actor.'
			);
		} else {
			for (let actor of this.actors) {
				if (player.isIntersect(actor)) return actor;
			}
			return undefined;
		}
	}

	obstacleAt(pos, size) {
		if (!(pos instanceof Vector) || !(size instanceof Vector)) {
			throw new Error('В метод obstacleAt передан не вектор.');
		} else {
			if (pos.y + size.y > this.height) return 'lava';
			if (pos.y < 0 || pos.x < 0 || pos.x + size.x > this.width) return 'wall';
			for (let i = 0; i < this.grid.length; i++) {
				for (let j = 0; j < this.grid[i].length; j++) {
					if (
						this.grid[i][j] !== undefined &&
						i >= pos.x &&
						i <= pos.x + size.x &&
						j >= pos.y &&
						i <= pos.y + size.y
					)
						return this.grid[i][j];
				}
			}
			return undefined;
		}
	}

	removeActor(actor) {
		const indexActor = this.actors.findIndex(obj => obj == actor);
		if (indexActor != -1) {
			this.actors.splice(indexActor, 1);
		}
	}

	noMoreActors(type) {
		let actors = [];
		this.actors.forEach(actor => {
			if (actor.type === type) {
				actors.push(actor);
			}
		});

		return actors.length === 0;
	}

	playerTouched(type, actor) {
		if (this.status === null) {
			if (type == 'lava' || type == 'fireball') {
				this.status = 'lost';
			} else if (
				type == 'coin' &&
				this.actors.findIndex(obj => obj == actor) != -1
			) {
				this.removeActor(actor);
				if (this.noMoreActors('coin')) this.status = 'won';
			}
		}
	}
}

class LevelParser {
	constructor(dictionary) {
		this.dictionary = dictionary;
	}
	actorFromSymbol(dictionarySymbol) {
		if (dictionarySymbol === undefined) {
			return undefined;
		} else {
			return this.dictionary[dictionarySymbol];
		}
	}
	obstacleFromSymbol(symbol) {
		switch (symbol) {
			case 'x':
				return 'wall';
			case '!':
				return 'lava';
			default:
				return undefined;
		}
	}
	createGrid(plan) {
		return plan.map(lowerString => {
			return lowerString
				.split('')
				.map(symbol => this.obstacleFromSymbol(symbol));
		});
	}
	createActors(plan) {
		let actors = [];
		let splittedArr = plan.map(el => el.split(''));
		splittedArr.forEach((row, y) => {
			row.forEach((cell, x) => {
				if (
					this.dictionary &&
					this.dictionary[cell] &&
					typeof this.dictionary[cell] === 'function'
				) {
					let actor = new this.dictionary[cell](new Vector(x, y));
					if (actor instanceof Actor) {
						actors.push(actor);
					}
				}
			});
		});
		return actors;
	}
	parse(plan) {
		return new Level(this.createGrid(plan), this.createActors(plan));
	}
}

class Fireball extends Actor {
	constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
		super();
		this.pos = pos;
		this.speed = speed;
	}

	get type() {
		return 'fireball';
	}

	getNextPosition(number = 1) {
		if (this.speed.x === 0 && this.speed.y === 0) {
			return this.pos;
		}

		return this.pos.plus(this.speed.times(number));
	}

	handleObstacle() {
		this.speed = this.speed.times(-1);
	}

	act(time, level) {
		let nextPosition = this.getNextPosition(time);
		let isIntersect = level.obstacleAt(nextPosition, this.size);
		if (!isIntersect) {
			this.pos = nextPosition;
		} else {
			this.handleObstacle();
		}
	}
}

class HorizontalFireball extends Fireball {
	constructor(pos) {
		super(pos);
		this.size = new Vector(1, 1);
		this.speed = new Vector(2, 0);
	}
}

class VerticalFireball extends Fireball {
	constructor(pos) {
		super(pos);
		this.size = new Vector(1, 1);
		this.speed = new Vector(0, 2);
	}
}

class FireRain extends Fireball {
	constructor(pos) {
		super(pos);
		this._pos = pos;
		this.size = new Vector(1, 1);
		this.speed = new Vector(0, 3);
	}

	handleObstacle() {
		this.pos = this._pos;
	}
}

class Coin extends Actor {
	constructor(pos) {
		super(pos);
		this.pos = this.pos.plus(new Vector(0.2, 0.1));
		this._pos = this.pos;
		this.size = new Vector(0.6, 0.6);
		this.springSpeed = 8;
		this.springDist = 0.07;
		this.spring = Math.random() * 2 * Math.PI;
	}

	get type() {
		return 'coin';
	}

	updateSpring(time = 1) {
		this.spring = this.spring + this.springSpeed * time;
	}

	getSpringVector() {
		return new Vector(0, Math.sin(this.spring) * this.springDist);
	}

	getNextPosition(time = 1) {
		this.updateSpring(time);
		let newPosition = new Vector(this._pos.x, this._pos.y);
		return newPosition.plus(this.getSpringVector());
	}

	act(time) {
		this.pos = this.getNextPosition(time);
	}
}

class Player extends Actor {
	constructor(pos) {
		super(pos);
		this.pos = this.pos.plus(new Vector(0, -0.5));
		this.size = new Vector(0.8, 1.5);
	}

	get type() {
		return 'player';
	}
}
