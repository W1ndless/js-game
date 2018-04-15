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
			actor.left >= this.right ||
			actor.right <= this.left ||
			actor.top >= this.bottom ||
			actor.bottom <= this.top ||
			actor === this
		) {
			return false;
		}
		return true;
	}
}

class Level {
	constructor(grid = [], actors = []) {
		this.grid = grid.slice();
		this.actors = actors.slice();
		this.player = this.actors.find(item => item.type === 'player');
		this.height = grid.length;
		this.width = Math.max(0, ...this.grid.map(line => line.length));
		this.status = null;
		this.finishDelay = 1;
	}

	isFinished() {
		return this.status !== null && this.finishDelay < 0;
	}

	actorAt(actorInstance) {
		if (arguments.length === 0 || !(actorInstance instanceof Actor)) {
			throw new Error(`Вы не передали движущийся объект`);
		}
		try {
			return this.actors.find(item => item.isIntersect(actorInstance));
		} catch (e) {
			console.log(e);
		}
	}

	obstacleAt(pos, size) {
		if (!(pos instanceof Vector) || !(size instanceof Vector)) {
			throw new Error('В метод obstacleAt передан не вектор.');
		}

		let xStart = Math.floor(pos.x);
		let xEnd = Math.ceil(pos.x + size.x);
		let yStart = Math.floor(pos.y);
		let yEnd = Math.ceil(pos.y + size.y);
		if (xStart < 0 || xEnd > this.width || yStart < 0) {
			return 'wall';
		}
		if (yEnd > this.height) {
			return 'lava';
		}
		for (let y = yStart; y < yEnd; y++) {
			for (let x = xStart; x < xEnd; x++) {
				let fieldType = this.grid[y][x];
				if (this.grid[y][x] !== undefined) {
					return this.grid[y][x];
				}
			}
		}
	}

	removeActor(actor) {
		this.actors = this.actors.filter(item => item !== actor);
	}

	noMoreActors(type) {
		return !this.actors.some(item => item.type === type);
	}

	playerTouched(itemType, actor) {
		if (this.status !== null) {
			return;
		}
		if (itemType === 'lava' || itemType === 'fireball') {
			this.status = 'lost';
		}
		if (itemType === 'coin') {
			this.removeActor(actor);
			if (this.noMoreActors('coin')) {
				this.status = 'won';
			}
		}
	}
}

class LevelParser {
	constructor(dictionary = {}) {
		this.dictionary = Object.assign({}, dictionary);
	}
	actorFromSymbol(symbol) {
		return this.dictionary[symbol];
	}
	obstacleFromSymbol(symbol) {
		switch (symbol) {
			case 'x':
				return 'wall';
			case '!':
				return 'lava';
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
				if (typeof this.dictionary[cell] === 'function') {
					const ACTOR = new this.dictionary[cell](new Vector(x, y));
					if (ACTOR instanceof Actor) {
						actors.push(ACTOR);
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
		super(pos, new Vector(1, 1), speed);
	}

	get type() {
		return 'fireball';
	}

	getNextPosition(number = 1) {
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
	constructor(pos = new Vector(1, 1)) {
		super(pos, new Vector(2, 0));
	}
}

class VerticalFireball extends Fireball {
	constructor(pos = new Vector(1, 1)) {
		super(pos, new Vector(0, 2));
	}
}

class FireRain extends Fireball {
	constructor(pos = new Vector(1, 1)) {
		super(pos, new Vector(0, 3));
		this.startPos = pos;
	}
	handleObstacle() {
		this.pos = this.startPos;
	}
}

class Coin extends Actor {
	constructor(pos = new Vector(0, 0)) {
		super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
		this.springSpeed = 8;
		this.springDist = 0.07;
		const MAX = 0;
		const MIN = Math.PI * 2;
		this.spring = Math.random() * (MAX - MIN) + MIN;
		this.basePos = this.pos;
	}
	get type() {
		return 'coin';
	}
	updateSpring(time = 1) {
		this.spring = this.spring + this.springSpeed * time;
	}
	getSpringVector(x = 0, y = 0) {
		return new Vector(x, y + Math.sin(this.spring) * this.springDist);
	}
	getNextPosition(time = 1) {
		this.updateSpring(time);
		return this.getSpringVector(this.basePos.x, this.basePos.y);
	}
	act(time = 0) {
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

const schemas = [
	[
		'!!!!v    ',
		'         ',
		'         ',
		' o       ',
		'xxxx     ',
		'       o ',
		'     xxxx',
		'         ',
		' @     o ',
		'xxxx xxxx',
		'         ',
	],
	[
		'         ',
		'         ',
		'    =    ',
		'       o ',
		'     !xxx',
		' @      ',
		'xxx!     ',
		'         ',
	],
	[
		'      v  ',
		'    v    ',
		'  v      ',
		'        o',
		'        x',
		'@   x    ',
		'x        ',
		'         ',
	],
];
const actorDict = {
	'@': Player,
	v: FireRain,
	o: Coin,
};
const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay).then(() =>
	console.log('Вы выиграли приз!')
);
