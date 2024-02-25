
const clamp = ( min, T, max ) => Math.max( min, Math.min( T, max ) );

var clk_frequency_input = document.getElementById("clk_frequency_input");
var clk_duration_input = document.getElementById("clk_duration_input");
var clk_canvas = document.getElementById("clk_canvas");
var q_canvas = document.getElementById("q_canvas");
var d_canvas = document.getElementById("d_canvas");

var CLK_FREQ = 2000.0;
var STOP_TIME = 2.5;

var RISING_CLKTOQ = 0.120;
var FALLING_CLKTOQ = 0.085;
var RISING_HOLDTIME = -0.029;
var FALLING_HOLDTIME = 0.002;
var RISING_SETUPTIME = 0.065;
var FALLING_SETUPTIME = 0.091;
var ASYNCSETTIME = 0;
var ASYNCRSTTIME = 0;

const freq2time = ( freq ) => (1000 / freq);
const time2freq = ( freq ) => (1000 / freq);

const time2canvasX = ( time, canvas ) => (Math.min((time / STOP_TIME) * canvas.width, canvas.width-1));

var multiranges = ["d_slider", "rst_slider", "set_slider"];


function handle_clk_frequency_input() {
    CLK_FREQ = Math.max(parseFloat(clk_frequency_input.min), parseFloat(clk_frequency_input.value));
    clk_frequency_input.value = CLK_FREQ;
    draw_canvases();
}
function handle_clk_duration_input() {
    STOP_TIME = Math.max(parseFloat(clk_frequency_input.min), parseFloat(clk_duration_input.value));
    clk_duration_input.value = STOP_TIME;
    fix_multiranges();
    draw_canvases();
}



function fix_multiranges() {
    for (let i = 0; i < multiranges.length; i++) {
        let mr = document.getElementById(multiranges[i]);
        let thumbs = mr.querySelectorAll('.multirange_thumb');
        thumbs.forEach(thumb => {
            thumb.setAttribute('min', 0);
            thumb.setAttribute('max', STOP_TIME);
            thumb.setAttribute('step', "any");
            thumb.setAttribute('value', clamp(0, parseFloat(thumb.value), STOP_TIME));
        });
        document.getElementById(multiranges[i]+"_sub").disabled = (thumbs.length == 0);
    }
}


function handle_slider_add(multirange) {
    let node = document.createElement("input");
    node.setAttribute("class", "multirange_thumb");
    node.setAttribute("type", "range");
    node.setAttribute("oninput", "handle_slider()");
    document.getElementById(multirange).appendChild(node);
    fix_multiranges();
    node.value = Math.random()*STOP_TIME;
    draw_canvases();
}

function handle_slider_sub(multirange) {
    let multirangeContainer = document.getElementById(multirange);
    let thumbs = multirangeContainer.getElementsByClassName("multirange_thumb");
    if (thumbs.length > 0) {
        // Remove the last thumb
        multirangeContainer.removeChild(thumbs[thumbs.length - 1]);
        fix_multiranges();
    }
    draw_canvases();
}

function multirange_to_toggles(multirange) {
    let thumbs = document.getElementById(multirange).querySelectorAll('.multirange_thumb');
    toggles = []
    let inverted = ["rst_slider", "set_slider"].includes(multirange);
    if (inverted) toggles.push(-1);
    thumbs.forEach(thumb => {
        toggles.push(parseFloat(thumb.value));
    });
    toggles.sort(function(a,b) { return a - b;});
    return toggles;
}

function clk_to_toggles() {
    toggles = [];
    let step = freq2time(CLK_FREQ)/2;
    t = step;
    while (t < STOP_TIME) {
        toggles.push(t);
        t += step;
    }
    return toggles;
}

function draw_toggle_canvases() {
    // d_canvas: draw red rectangle around aperture, draw blue line at clktoq
    const canvases = document.querySelectorAll('.toggle_canvas');
    canvases.forEach(canvas => {
        const togglesAttr = canvas.getAttribute('toggles');
        if (togglesAttr) {
            const ctx = canvas.getContext('2d');
            let toggles = eval(togglesAttr);
            if (toggles === undefined)
                console.error(`${togglesAttr} failed`)
            toggles.push(STOP_TIME);
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before drawing
            ctx.strokeStyle = 'black';
            ctx.beginPath();
            ctx.moveTo(0, canvas.height); // Start from the bottom of the canvas
            let value_is_1 = false;
            toggles.forEach(toggle => {
                if (toggle > STOP_TIME) return; // If toggle time is after STOP_TIME, exit loop
                const nextX = time2canvasX(toggle, canvas);
                if (value_is_1) {
                    ctx.lineTo(nextX, 0);
                    if (toggle < STOP_TIME) ctx.lineTo(nextX, canvas.height);
                    value_is_1 = false;
                } else {
                    ctx.lineTo(nextX, canvas.height);
                    if (toggle < STOP_TIME) ctx.lineTo(nextX, 0);
                    value_is_1 = true;
                }
            });
            ctx.stroke();
        }
    });
    // draw aux shapes to d_canvas
    const d_canvas = document.getElementById("d_canvas");
    const d_ctx = d_canvas.getContext('2d');
    const posedges = clk_to_toggles().filter((_, index) => index % 2 === 0);
    posedges.forEach(posedge => {
        let q_toggle_index = q_toggles().findIndex((q_toggle) => posedge < q_toggle);
        if (q_toggle_index == -1)
            q_toggle_index = q_toggles().length;
        const q_value = (q_toggle_index%2);

        const setup_time = q_value ? FALLING_SETUPTIME : RISING_SETUPTIME;
        const hold_time = q_value ? FALLING_HOLDTIME : RISING_HOLDTIME;
        const clktoq = q_value ? FALLING_CLKTOQ : RISING_CLKTOQ;
        const rect_x = time2canvasX(posedge - setup_time, d_canvas);
        const rect_w = time2canvasX(setup_time + hold_time, d_canvas);
        const line_x = time2canvasX(posedge + clktoq, d_canvas);

        d_ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        d_ctx.fillRect(rect_x, 0, rect_w, d_canvas.height);

        d_ctx.beginPath();
        d_ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
        d_ctx.moveTo(line_x, 0);
        d_ctx.lineTo(line_x, d_canvas.height);
        d_ctx.stroke();
    });
}

function multirange_value_at_time(multirange, time) {
    let d_toggles = multirange_to_toggles(multirange);
    let toggle_index = 0;
    for (toggle_index = 0; toggle_index < d_toggles.length; toggle_index++) {
        if (time < d_toggles[toggle_index]) {
            break;
        }
    }
    return (toggle_index%2);
}

function q_toggles() {
    const has_sync_rst = document.getElementById("sync_rst").checked;
    const has_async_rst = document.getElementById("async_rst").checked;
    const has_async_set = document.getElementById("async_set").checked;

    // Generate update events
    const set_events = multirange_to_toggles('set_slider').map(value => ({ name: 'set', value }));
    const rst_events = multirange_to_toggles('rst_slider').map(value => ({ name: 'rst', value }));
    const clk_events = clk_to_toggles().map(value => ({ name: 'clk', value }));
    const filtered_set_events = set_events.filter(event => event.value >= 0);
    const filtered_rst_events = rst_events.filter(event => event.value >= 0);
    const filtered_clk_events = clk_events.filter((_, index) => index % 2 === 0);
    const events = [...filtered_set_events, ...filtered_rst_events, ...filtered_clk_events].sort((a, b) => a.value - b.value);

    let value_is_1 = false;
    let toggles = [];

    for (const event of events) {
        if (value_is_1) {
            if (has_async_rst && event.name == "rst" && !multirange_value_at_time("rst_slider", event.value)) {
                toggles.push(event.value + ASYNCRSTTIME)
                value_is_1 = 0;
            } else if (has_async_set && event.name == "set") {
            } else if (has_async_set && !multirange_value_at_time("set_slider", event.value - ASYNCSETTIME)) {
            } else if (has_async_set && event.name == "clk" && !multirange_value_at_time("set_slider", event.value - ASYNCSETTIME + FALLING_CLKTOQ)) {
                // maintain 1
            } else if (event.name == "clk") {
                let value_before_setup = multirange_value_at_time("d_slider", event.value - FALLING_SETUPTIME);
                let value_after_hold = multirange_value_at_time("d_slider", event.value + FALLING_HOLDTIME);
                if (has_sync_rst) {
                    value_before_setup &= multirange_value_at_time("rst_slider", event.value - FALLING_SETUPTIME);
                    value_after_hold &= multirange_value_at_time("rst_slider", event.value + FALLING_HOLDTIME);
                }
                if (value_before_setup == 0 && value_after_hold == 0) {
                    toggles.push(event.value + FALLING_CLKTOQ)
                    value_is_1 = 0;
                }
            }
        } else {
            if (has_async_rst && event.name == "rst" && !multirange_value_at_time("rst_slider", event.value)) {
            } else if (has_async_rst && !multirange_value_at_time("rst_slider", event.value - ASYNCRSTTIME)) {
            } else if (has_async_rst && event.name == "clk" && !multirange_value_at_time("rst_slider", event.value - ASYNCRSTTIME + RISING_CLKTOQ)) {
                // maintain 0
            } else if (has_async_set && event.name == "set") {
                toggles.push(event.value + ASYNCSETTIME)
                value_is_1 = 1;
            } else if (event.name == "clk") {
                let value_before_setup = multirange_value_at_time("d_slider", event.value - RISING_SETUPTIME);
                let value_after_hold = multirange_value_at_time("d_slider", event.value + RISING_HOLDTIME);
                if (has_sync_rst) {
                    value_before_setup &= multirange_value_at_time("rst_slider", event.value - RISING_SETUPTIME);
                    value_after_hold &= multirange_value_at_time("rst_slider", event.value + RISING_HOLDTIME);
                }
                if (value_before_setup == 1 && value_after_hold == 1) {
                    toggles.push(event.value + RISING_CLKTOQ)
                    value_is_1 = 1;
                }
            }
        }
    }

    return toggles;
}

function handle_slider() {
    draw_canvases();
}

function handle_sync_rst() {
    const dom_sync_rst = document.getElementById("sync_rst");
    if (dom_sync_rst.checked) {
        document.getElementById("async_rst").disabled = true;
        document.getElementById("async_rst").checked = false;
        document.getElementById("schematic_no_sync_rst").style.visibility = "hidden";
        document.getElementById("schematic_sync_rst").style.visibility = "visible";
        document.getElementById("rst_slider_cell").style.visibility = "visible";
        document.getElementById("rst_cell").style.visibility = "visible";
    } else {
        document.getElementById("async_rst").disabled = false;
        document.getElementById("async_rst").checked = false;
        document.getElementById("schematic_no_sync_rst").style.visibility = "visible";
        document.getElementById("schematic_sync_rst").style.visibility = "hidden";
        document.getElementById("rst_slider_cell").style.visibility = "hidden";
        document.getElementById("rst_cell").style.visibility = "hidden";
    }
    draw_canvases();
}
function handle_async_rst() {
    const dom_async_rst = document.getElementById("async_rst");
    if (dom_async_rst.checked) {
        document.getElementById("sync_rst").disabled = true;
        document.getElementById("sync_rst").checked = false;
        document.getElementById("schematic_no_async_rst").style.visibility = "hidden";
        document.getElementById("schematic_async_rst").style.visibility = "visible";
        document.getElementById("rst_slider_cell").style.visibility = "visible";
        document.getElementById("rst_cell").style.visibility = "visible";
    } else {
        document.getElementById("sync_rst").disabled = false;
        document.getElementById("sync_rst").checked = false;
        document.getElementById("schematic_no_async_rst").style.visibility = "visible";
        document.getElementById("schematic_async_rst").style.visibility = "hidden";
        document.getElementById("rst_slider_cell").style.visibility = "hidden";
        document.getElementById("rst_cell").style.visibility = "hidden";
    }
    draw_canvases();
}
function handle_async_set() {
    const dom_async_set = document.getElementById("async_set");
    if (dom_async_set.checked) {
        document.getElementById("schematic_no_async_set").style.visibility = "hidden";
        document.getElementById("schematic_async_set").style.visibility = "visible";
        document.getElementById("set_cell").style.visibility = "visible";
        document.getElementById("set_slider_cell").style.visibility = "visible";
    } else {
        document.getElementById("schematic_no_async_set").style.visibility = "visible";
        document.getElementById("schematic_async_set").style.visibility = "hidden";
        document.getElementById("set_cell").style.visibility = "hidden";
        document.getElementById("set_slider_cell").style.visibility = "hidden";
    }
    draw_canvases();
}

function draw_canvases() {
    document.querySelectorAll('canvas').forEach(canvas => {
        const computedStyle = getComputedStyle(canvas);
        canvas.width = parseInt(computedStyle.width);
        canvas.height = parseInt(computedStyle.height);
    });
    draw_toggle_canvases();
}

fix_multiranges();
handle_clk_frequency_input();
handle_clk_duration_input();
window.addEventListener('resize', draw_canvases, false);
draw_canvases();

document.getElementById("schematic_shared").style.visibility = "visible";
handle_sync_rst();
handle_async_rst();
handle_async_set();
