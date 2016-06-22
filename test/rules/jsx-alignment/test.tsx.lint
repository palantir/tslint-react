const good = <Foo
    bar="car"
    car
    dar={"far"}
/>;

    const alsoGood = <Foo
        star
        mar={52}
    />

    const veryGood = <div
        className="my-class"
        tabIndex={-1}
    >
        {children}
    </div>;

function goodRender() {
    return (
        <div className="red">
            <img src="myImage.jpg"/>
            <Element
                alpha={1}
                bravo={2}
            />
            <Element
                charlie={3}
                delta
            >
                {children}
            </Element>
        </div>
    );
}

const bad = <Foo bar
                 ~~~ [JSX attributes must be on a line below the opening tag]
                 car
/>;

    const alsoBad = <Foo
        bar
        car />;
            ~   [Tag closing must be on its own line and aligned with opening of tag]

function badRender() {
    return (
        <div aar
             ~~~ [JSX attributes must be on a line below the opening tag]
            bar={0} car={0}
            ~~~~~~~         [JSX attributes must be on their own line and vertically aligned]
                    ~~~~~~~ [JSX attributes must be on their own line and vertically aligned]
           >
           ~ [Tag closing must be on its own line and aligned with opening of tag]
             <span/></div>
                    ~~~~~~ [Closing tag must be on its own line and aligned with opening tag]
     );
}
