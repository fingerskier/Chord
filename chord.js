




var Card = class{
    constructor(card){
        this.card = card

        this.actions = card.actions || 0
        this.choices = card.choices || 0
        this.text = card.text || 'TEXT'
        this.title = card.title || 'TITLE'
    }

    act(target){
        for (let X in this.actions) {
            let property = this.actions[X].what
            let adjustment = this.actions[X].how

            target[property] = target[property] + adjustment
        }
    }

    choose(I){
        return this.choices[I].target
    }
}






function card(){
    return {
        id: 'thingy'
        ,
        title: 'Thingy Title'
        ,
        text: 'Thingy narrative text.'
        ,
        actions: [{
            what: 'flarn',
            how: -3
        }]
        ,
        choices: [{
            question: 'Who?',
            target: 'thing1'
        },{
            question: 'What?',
            target: 'thing2'
        },{
            question: 'When?',
            target: 'thing3'
        }]
    }
}