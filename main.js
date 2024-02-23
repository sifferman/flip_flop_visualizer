
const clamp = ( min, T, max ) => Math.max( min, Math.min( T, max ) );

var clk_frequency_input = document.getElementById("clk_frequency_input");
var clk_duration_input = document.getElementById("clk_duration_input");
var clk_canvas = document.getElementById("clk_canvas");
var q_canvas = document.getElementById("q_canvas");
var d_canvas = document.getElementById("d_canvas");

var CLK_FREQ = 500.0;
var STOP_TIME = 5.0;

var RISING_CLKTOQ = 0.120;
var FALLING_CLKTOQ = 0.085;
var RISING_HOLDTIME = -0.065;
var FALLING_HOLDTIME = 0.002;
var RISING_SETUPTIME = 0.029;
var FALLING_SETUPTIME = 0.091;
var ASYNCSETTIME = 0.029;
var ASYNCRSTTIME = 0.029;

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
    let inverted = ["rst_slider", "set_slider"].includes(multirange);
    let thumbs = document.getElementById(multirange).querySelectorAll('.multirange_thumb');
    toggles = []
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
    const canvases = document.querySelectorAll('.toggle_canvas');
    canvases.forEach(canvas => {
        const togglesAttr = canvas.getAttribute('toggles');
        if (togglesAttr) {
            const ctx = canvas.getContext('2d');
            let toggles = eval(togglesAttr);
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
}

function toggle_value_at_time(multirange, time) {
    let d_toggles = multirange_to_toggles(multirange);
    let toggle_index = 0;
    for (toggle_index = 0; toggle_index < d_toggles.length; toggle_index++) {
        if (time < d_toggles[toggle_index]) {
            break;
        }
    }
    return (toggle_index%2);
}

function draw_q_canvas() {
    const canvas = document.getElementById("q_canvas");
    const ctx = canvas.getContext('2d');

    const has_sync_rst = document.getElementById("sync_rst").checked;
    const has_async_rst = document.getElementById("async_rst").checked;
    const has_async_set = document.getElementById("async_set").checked;

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before drawing

    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height); // Start from the bottom of the canvas

    let cycle = 0;
    let nextTime = 0;
    let value_is_1 = false;
    while (nextTime < STOP_TIME) {
        nextTime = (freq2time(CLK_FREQ)/2) + (freq2time(CLK_FREQ)*cycle);
        if (value_is_1) {
            nextTime += FALLING_CLKTOQ;
            const nextX = time2canvasX(nextTime, canvas);
            let value_before_setup = toggle_value_at_time("d_slider", nextTime - FALLING_SETUPTIME);
            let value_after_hold = toggle_value_at_time("d_slider", nextTime + FALLING_HOLDTIME);
            if (has_sync_rst) {
                value_before_setup &= toggle_value_at_time("rst_slider", nextTime - FALLING_SETUPTIME);
                value_after_hold &= toggle_value_at_time("rst_slider", nextTime + FALLING_HOLDTIME);
            }
            ctx.lineTo(nextX, 0);
            if ((value_before_setup == 0)&&(value_after_hold == 0)) {
                if (nextTime < STOP_TIME) ctx.lineTo(nextX, canvas.height);
                value_is_1 = false;
            }
        } else {
            nextTime += RISING_CLKTOQ;
            const nextX = time2canvasX(nextTime, canvas);
            let value_before_setup = toggle_value_at_time("d_slider", nextTime - RISING_SETUPTIME);
            let value_after_hold = toggle_value_at_time("d_slider", nextTime + RISING_HOLDTIME);
            if (has_sync_rst) {
                value_before_setup &= toggle_value_at_time("rst_slider", nextTime - RISING_SETUPTIME);
                value_after_hold &= toggle_value_at_time("rst_slider", nextTime + RISING_HOLDTIME);
            }
            ctx.lineTo(nextX, canvas.height);
            if ((value_before_setup == 1)&&(value_after_hold == 1)) {
                if (nextTime < STOP_TIME) ctx.lineTo(nextX, 0);
                value_is_1 = true;
            }
        }
        cycle++;
    }
    ctx.stroke();
}

function handle_slider() {
    draw_toggle_canvases();
    draw_q_canvas();
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
    draw_q_canvas();
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
